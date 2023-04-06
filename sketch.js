let buffer;
let shLinearMix, shSpectralMix;
let colorPicker1, colorPicker2;
let color1, color2;

function linear_vertex() {
  return `
#ifdef GL_ES
precision lowp float;
#endif

attribute vec3 aPosition;

void main() {
 vec4 positionVec4 = vec4(aPosition, 1.0);

  positionVec4.xy = positionVec4.xy * 2.0 - 1.0; 

  gl_Position = positionVec4;
}
  `;
}

function linear_fragment() {
  return `
#ifdef GL_ES
precision lowp float;
#endif

uniform vec2 u_resolution;
uniform vec4 u_color1;
uniform vec4 u_color2;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;

    st.y = 1.0 - st.y;

    vec4 col = mix(u_color1, u_color2, st.x); 

    gl_FragColor = col;
}
  `;
}

function setup() {
  let canvas = createCanvas(800, 430);
  canvas.parent('container');
  pixelDensity(4);

  buffer = createGraphics(800, 100, WEBGL);
  buffer.setAttributes({ alpha: false });
  buffer.pixelDensity(1);
  buffer.noStroke();
  buffer.noSmooth();

  shSpectralMix = buffer.createShader(spectral.webgl_vertex(), spectral.webgl_fragment());
  shLinearMix = buffer.createShader(linear_vertex(), linear_fragment());

  colorPicker1 = createColorPicker('#00357b');
  colorPicker1.parent('picker-1');
  color1 = '';

  colorPicker2 = createColorPicker('#d79900');
  colorPicker2.parent('picker-2');
  color2 = '';
}

function draw() {
  if (color1.toString() != colorPicker1.color().toString() || color2.toString() != colorPicker2.color().toString()) {
    color1 = colorPicker1.color();
    color2 = colorPicker2.color();

    noStroke();
    textSize(30);
    fill('#46757A');
    textFont('Arial');

    text('RGB mix', 0, 25);

    buffer.shader(shLinearMix);
    shLinearMix.setUniform('u_resolution', [buffer.width, buffer.height]);
    shLinearMix.setUniform('u_color1', spectral.webgl_color(color1.levels));
    shLinearMix.setUniform('u_color2', spectral.webgl_color(color2.levels));
    buffer.rect(0, 0, buffer.width, buffer.height);

    image(buffer, 0, 35, buffer.width, buffer.height, 0, 0, buffer.width, buffer.height);

    text('Spectral.js mix (shader)', 0, 175);

    buffer.clear();

    buffer.shader(shSpectralMix);
    shSpectralMix.setUniform('u_resolution', [buffer.width, buffer.height]);
    shSpectralMix.setUniform('u_color1', spectral.webgl_color(color1.levels));
    shSpectralMix.setUniform('u_color2', spectral.webgl_color(color2.levels));
    buffer.rect(0, 0, buffer.width, buffer.height);

    image(buffer, 0, 185, buffer.width, buffer.height, 0, 0, buffer.width, buffer.height);

    buffer.clear();

    text('Spectral.js mix (javascript)', 0, 325);

    let steps = 8;
    for (var i = 0; i <= steps; i++) {
      let c = spectral.mix(color1.levels, color2.levels, i / steps);
      fill(c);
      rect(i * (width / (steps + 1)), 335, width / (steps + 1) + 1, 100);
    }

    let paletteElement = document.querySelector('#palette');
    paletteElement.querySelectorAll('span').forEach((e) => e.remove());

    let palette = spectral.palette(color1.levels, color2.levels, steps + 1);

    palette.forEach((c) => {
      paletteElement.appendChild(document.createElement('span')).textContent = c;
    });
  }
}
