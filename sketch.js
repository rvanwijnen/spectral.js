let buffer;
let shLinearMix, shSpectralMix;
let colorPicker1, colorPicker2;
let color1, color2;

function setup_shaders() {
  let vertex = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    attribute vec3 aPosition;

    void main() {
    vec4 positionVec4 = vec4(aPosition, 1.0);

      positionVec4.xy = positionVec4.xy * 2.0 - 1.0; 

      gl_Position = positionVec4;
    }
  `;

  let fragment_linear = `
    #ifdef GL_ES
    precision mediump float;
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

  let fragment_spectral = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    #include "spectral.glsl"

    uniform vec2 u_resolution;
    uniform vec4 u_color1;
    uniform vec4 u_color2;

    void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;

        st.y = 1.0 - st.y;

        vec4 col = spectral_mix(u_color1, u_color2, st.x); 

        gl_FragColor = col;
    }
  `;

  fragment_spectral = fragment_spectral.replace('#include "spectral.glsl"', spectral.glsl());

  shLinearMix = buffer.createShader(vertex, fragment_linear);
  shSpectralMix = buffer.createShader(vertex, fragment_spectral);
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

  setup_shaders();

  colorPicker1 = createColorPicker('#002185');
  colorPicker1.parent('picker-1');
  color1 = '';

  colorPicker2 = createColorPicker('#fcd200');
  colorPicker2.parent('picker-2');
  color2 = '';
}

function draw() {
  color1 = colorPicker1.color();
  color2 = colorPicker2.color();

  noStroke();
  textSize(30);
  fill('#555555');
  textFont('Arial');

  text('RGB mix', 0, 25);

  buffer.shader(shLinearMix);
  shLinearMix.setUniform('u_resolution', [buffer.width, buffer.height]);
  shLinearMix.setUniform('u_color1', spectral.glsl_color(color1.levels));
  shLinearMix.setUniform('u_color2', spectral.glsl_color(color2.levels));
  buffer.rect(0, 0, buffer.width, buffer.height);

  image(buffer, 0, 35, buffer.width, buffer.height, 0, 0, buffer.width, buffer.height);

  text('Spectral.js mix (shader)', 0, 175);

  buffer.clear();

  buffer.shader(shSpectralMix);
  shSpectralMix.setUniform('u_resolution', [buffer.width, buffer.height]);
  shSpectralMix.setUniform('u_color1', spectral.glsl_color(color1.levels));
  shSpectralMix.setUniform('u_color2', spectral.glsl_color(color2.levels));
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
