import { useEffect, useRef } from 'react';

export default function WebGLBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    const syncSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    window.addEventListener('resize', syncSize);
    syncSize();

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;

      void main() {
        vec2 uv = v_texCoord;
        vec2 mouse = u_mouse / u_resolution;

        float noise = sin(uv.x * 10.0 + u_time * 0.5) * cos(uv.y * 10.0 + u_time * 0.5);
        noise += sin(uv.x * 20.0 - u_time * 0.8) * cos(uv.y * 15.0 + u_time * 0.7) * 0.5;

        float dist = distance(uv, mouse);
        float mouseInfluence = smoothstep(0.4, 0.0, dist) * 0.3;

        // Warm ivory / saffron palette — soft cream wash, red-gold undertones
        vec3 color1 = vec3(0.992, 0.973, 0.941);  // Ivory page base
        vec3 color2 = vec3(0.961, 0.925, 0.871);  // Warm sand
        vec3 color3 = vec3(0.953, 0.890, 0.784);  // Saffron cream

        float t = noise * 0.5 + 0.5;
        vec3 finalColor = mix(color1, color2, t * 0.7);
        // slow second wave adds faint saffron banding
        float band = sin(uv.y * 6.0 - u_time * 0.4) * 0.5 + 0.5;
        finalColor = mix(finalColor, color3, band * 0.18);
        // interactive warm glow near the cursor
        finalColor = mix(finalColor, vec3(0.992, 0.973, 0.941), mouseInfluence);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const compileShader = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = window.innerHeight - e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId;
    const render = (t) => {
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };
    render(0);

    return () => {
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full -z-10 opacity-40">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#FDF8F0] pointer-events-none" />
    </div>
  );
}
