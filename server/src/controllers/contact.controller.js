import { asyncHandler } from '../middleware/asyncHandler.js';
import * as contactService from '../services/contact.service.js';

export const createContactMessage = asyncHandler(async (req, res) => {
  res.status(201).json(await contactService.createContactMessage(req.body));
});

export const listContactMessages = asyncHandler(async (req, res) => {
  res.json(await contactService.listContactMessages());
});

export const updateContactMessage = asyncHandler(async (req, res) => {
  res.json(await contactService.updateContactMessage(req.params.id, req.body));
});

export const listSellerContactMessages = asyncHandler(async (req, res) => {
  res.json(await contactService.listSellerContactMessages(req.user.id));
});

export const updateSellerContactMessage = asyncHandler(async (req, res) => {
  res.json(await contactService.updateSellerContactMessage(req.user.id, req.params.id, req.body));
});

export const deleteContactMessage = asyncHandler(async (req, res) => {
  await contactService.deleteContactMessage(req.params.id);
  res.status(204).end();
});
