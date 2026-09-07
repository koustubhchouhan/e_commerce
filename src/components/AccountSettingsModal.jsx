import { useEffect, useRef, useState } from 'react';
import { X, Save, Upload, Mail, Lock, User, MapPin, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToastStore } from '../store/toastStore';

const inputClass =
  'w-full bg-[#1a1307]/70 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-[#f1e7d7] outline-none focus:border-[#ff9933] transition-all placeholder:text-[#6f6048]';
const labelClass = 'block text-[#cbb89d] text-xs font-semibold uppercase tracking-wider mb-2';

// Shared "account settings" modal used on the customer, seller and admin
// profile pages. It edits the personal profile row (name, avatar, phone,
// saved shipping address for customers) plus the security bits that live on
// the Supabase auth identity (email and password).
export default function AccountSettingsModal({ open, onClose, initialTab = 'profile' }) {
  const { user, applyUserPatch } = useAuth();
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState(initialTab);
  const [busy, setBusy] = useState(false);

  // Profile fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [ship, setShip] = useState({ firstName: '', lastName: '', address: '', city: '', pin: '', phone: '' });

  // Security fields
  const [newEmail, setNewEmail] = useState('');
  const [curPassword, setCurPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setName(user?.fullName ?? '');
    setPhone(user?.phone ?? '');
    setNewEmail(user?.email ?? '');
    setShip({
      firstName: user?.shippingAddress?.firstName ?? '',
      lastName: user?.shippingAddress?.lastName ?? '',
      address: user?.shippingAddress?.address ?? '',
      city: user?.shippingAddress?.city ?? '',
      pin: user?.shippingAddress?.pin ?? '',
      phone: user?.shippingAddress?.phone ?? '',
    });
    // reset transient fields
    setAvatarFile(null);
    setAvatarPreview(null);
    setCurPassword('');
    setNewPassword('');
    setConfirmPassword('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTab]);

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please choose an image file.', 'error');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const shippingValue = (() => {
    const hasAny = Object.values(ship).some((v) => String(v ?? '').trim() !== '');
    if (!hasAny) return null;
    const cleaned = {};
    Object.entries(ship).forEach(([k, v]) => {
      cleaned[k] = String(v ?? '').trim();
    });
    return cleaned;
  })();

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      // Upload first so the final updateProfile call carries the fresh URL.
      if (avatarFile) {
        const uploaded = await api.uploadAvatar(avatarFile);
        applyUserPatch(uploaded);
      }
      const patch = {
        fullName: name.trim(),
        phone: phone.trim(),
      };
      // Saved default shipping address only makes sense for customers.
      if (user?.role === 'customer') patch.shippingAddress = shippingValue;
      const updated = await api.updateProfile(patch);
      applyUserPatch(updated);
      addToast('Profile updated!', 'success');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (busy) return;
    const value = newEmail.trim();
    if (!value) {
      addToast('Enter a new email address.', 'error');
      return;
    }
    if (value === user?.email) {
      addToast('That is already your email address.', 'error');
      return;
    }
    setBusy(true);
    try {
      const updated = await api.changeEmail(value);
      applyUserPatch(updated);
      addToast('Email updated. Use it next time you sign in.', 'success');
      setTab('profile');
    } catch (err) {
      addToast(err.message || 'Failed to update email.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (newPassword.length < 8) {
      addToast('Password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New password and confirmation do not match.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword({ currentPassword: curPassword, newPassword });
      addToast('Password updated.', 'success');
      setCurPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const tabBtn = (key, label, Icon) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        tab === key
          ? 'bg-[#ff9933]/15 text-[#ff9933] border border-[#ff9933]/30'
          : 'text-[#9e8c73] hover:text-[#f1e7d7] border border-transparent'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Account settings"
    >
      <div
        className="glass-panel rounded-xl w-full max-w-2xl animate-scale-in p-0 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 md:px-8 py-5 border-b border-white/10">
          <div>
            <h2 className="font-[Outfit] text-2xl font-bold text-[#fff4e6] flex items-center gap-2">
              <User className="text-[#ff9933]" size={24} /> Account Settings
            </h2>
            <p className="text-[#cbb89d] text-xs mt-1">Manage your profile, sign-in email and password.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg text-[#cbb89d] hover:text-[#fff4e6] hover:bg-white/5 transition-colors" aria-label="Close">
            <X size={22} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 md:px-8 pt-4 border-b border-white/5">
          {tabBtn('profile', 'Profile', User)}
          {tabBtn('security', 'Sign-in & Security', Lock)}
        </div>

        <div className="px-6 md:px-8 py-6 max-h-[65vh] overflow-y-auto">
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-[#2b1d0d] border border-[#4b3d2a] overflow-hidden flex items-center justify-center shrink-0">
                  {avatarPreview || user?.avatarUrl ? (
                    <img
                      src={avatarPreview || user?.avatarUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="text-[#6f6048]" size={32} />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={pickAvatar}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#f1e7d7] text-sm font-semibold transition-colors w-fit"
                  >
                    <Upload size={15} /> {avatarFile ? 'Choose another' : 'Upload photo'}
                  </button>
                  <span className="text-[#9e8c73] text-[11px]">JPG/PNG up to 5MB</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Full name</label>
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              {user?.role === 'customer' && (
                <div className="rounded-xl border border-white/10 bg-[#1a1307]/40 p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-[#ff7418]">
                    <MapPin size={17} />
                    <h3 className="font-[Outfit] text-sm font-bold uppercase tracking-wider">Default shipping address</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>First name</label>
                      <input className={inputClass} value={ship.firstName} onChange={(e) => setShip({ ...ship, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Last name</label>
                      <input className={inputClass} value={ship.lastName} onChange={(e) => setShip({ ...ship, lastName: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Address line</label>
                      <input className={inputClass} value={ship.address} onChange={(e) => setShip({ ...ship, address: e.target.value })} placeholder="1284 Neon Boulevard, Apt 404" />
                    </div>
                    <div>
                      <label className={labelClass}>City</label>
                      <input className={inputClass} value={ship.city} onChange={(e) => setShip({ ...ship, city: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>PIN / ZIP</label>
                      <input className={inputClass} value={ship.pin} onChange={(e) => setShip({ ...ship, pin: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelClass}>Phone for delivery</label>
                      <input className={inputClass} value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-[#9e8c73] text-[11px]">Used to pre-fill the checkout form. You can still change it per order.</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg border border-white/10 text-[#f1e7d7] text-sm font-semibold hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !name.trim()}
                  className={`px-6 py-2.5 rounded-lg font-[Outfit] text-sm font-bold flex items-center gap-2 transition-all ${
                    busy || !name.trim()
                      ? 'bg-[#34250f]/50 text-[#6f6048] cursor-not-allowed'
                      : 'bg-gradient-to-br from-[#ff9933] to-[#ff7418] text-[#2e1800] hover:shadow-[0_0_9px_rgba(255,153,51,0.22)]'
                  }`}
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {busy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {tab === 'security' && (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-white/10 bg-[#1a1307]/40 p-4">
                <div className="flex items-center gap-2 text-[#ffd27a] mb-4">
                  <Mail size={17} />
                  <h3 className="font-[Outfit] text-sm font-bold uppercase tracking-wider">Sign-in email</h3>
                </div>
                <form onSubmit={handleChangeEmail} className="flex flex-col gap-3">
                  <input className={inputClass} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new.email@example.com" type="email" />
                  <p className="text-[#9e8c73] text-[11px]">
                    Changing this updates the address you sign in with. You'll use the new email on your next login.
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-5 py-2.5 rounded-lg font-[Outfit] text-sm font-bold bg-gradient-to-br from-[#ffd27a] to-[#ff9933] text-[#2e1800] hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all disabled:opacity-60 flex items-center gap-2"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Update Email
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#1a1307]/40 p-4">
                <div className="flex items-center gap-2 text-[#ffd27a] mb-4">
                  <Lock size={17} />
                  <h3 className="font-[Outfit] text-sm font-bold uppercase tracking-wider">Password</h3>
                </div>
                <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
                  <div>
                    <label className={labelClass}>Current password</label>
                    <input className={inputClass} type="password" value={curPassword} onChange={(e) => setCurPassword(e.target.value)} placeholder="Your current password" autoComplete="current-password" />
                    <p className="text-[#9e8c73] text-[11px] mt-1">Leave blank if you signed up with Google and don't have a password yet.</p>
                  </div>
                  <div>
                    <label className={labelClass}>New password</label>
                    <input className={inputClass} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
                  </div>
                  <div>
                    <label className={labelClass}>Confirm new password</label>
                    <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat the new password" autoComplete="new-password" />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-5 py-2.5 rounded-lg font-[Outfit] text-sm font-bold bg-gradient-to-br from-[#ffd27a] to-[#ff9933] text-[#2e1800] hover:shadow-[0_0_9px_rgba(255,153,51,0.22)] transition-all disabled:opacity-60 flex items-center gap-2"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Update Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
