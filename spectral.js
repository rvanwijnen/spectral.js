//  MIT License
//
//  Copyright (c) 2023 Ronald van Wijnen
//
//  Permission is hereby granted, free of charge, to any person obtaining a
//  copy of this software and associated documentation files (the "Software"),
//  to deal in the Software without restriction, including without limitation
//  the rights to use, copy, modify, merge, publish, distribute, sublicense,
//  and/or sell copies of the Software, and to permit persons to whom the
//  Software is furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//  DEALINGS IN THE SOFTWARE.

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? factory(exports)
    : typeof define === 'function' && define.amd
    ? define(['exports'], factory)
    : ((global = global || self), factory((global.spectral = {})));
})(this, function (exports) {
  ('use strict');

  const RGB = 0;
  const RGBA = 1;
  const HEX = 2;
  const HEXA = 3;

  const SIZE = 37;
  const GAMMA = 2.4;
  const EPSILON = 0.00000001;

  function linear_to_concentration(l1, l2, t) {
    let t1 = l1 * Math.pow(1 - t, 2);
    let t2 = l2 * Math.pow(t, 2);

    return t2 / (t1 + t2);
  }

  function luminance(color) {
    //D65 Y
    return dotproduct(D65_RGB_XYZ[1], color);
  }

  function mix(color1, color2, t, returnFormat) {
    color1 = unpack(color1);
    color2 = unpack(color2);

    let lrgb1 = srgb_to_linear(color1);
    let lrgb2 = srgb_to_linear(color2);

    let l1 = luminance(lrgb1);
    let l2 = luminance(lrgb2);

    let R1 = linear_to_reflectance(lrgb1);
    let R2 = linear_to_reflectance(lrgb2);

    t = linear_to_concentration(l1, l2, t);

    let R = [];

    for (let i = 0; i < SIZE; i++) {
      let KS = 0;

      KS += (1 - t) * (Math.pow(1 - R1[i], 2) / (2 * R1[i]));
      KS += t * (Math.pow(1 - R2[i], 2) / (2 * R2[i]));

      let KM = 1 + KS - Math.sqrt(Math.pow(KS, 2) + 2 * KS);

      //Saunderson correction
      // let S = ((1.0 - K1) * (1.0 - K2) * KM) / (1.0 - K2 * KM);

      R.push(KM);
    }

    let rgb = xyz_to_srgb(reflectance_to_xyz(R));

    rgb.push(lerp(color1[3], color2[3], t));

    return pack(rgb, returnFormat);
  }

  function palette(color1, color2, size, returnFormat) {
    let g = [];

    for (let i = 0; i < size; i++) {
      g.push(mix(color1, color2, i / (size - 1), returnFormat));
    }

    return g;
  }

  function uncompand(x, g) {
    return x < 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, GAMMA);
  }

  function compand(x, g) {
    return x < 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1.0 / GAMMA) - 0.055;
  }

  function srgb_to_linear(srgb) {
    //add epsilon to prevent division by zero
    let r = uncompand((srgb[0] + EPSILON) / 255.0);
    let g = uncompand((srgb[1] + EPSILON) / 255.0);
    let b = uncompand((srgb[2] + EPSILON) / 255.0);

    return [r, g, b];
  }

  function linear_to_srgb(lrgb) {
    //remove epsilon
    let r = compand(lrgb[0] - EPSILON);
    let g = compand(lrgb[1] - EPSILON);
    let b = compand(lrgb[2] - EPSILON);

    return [Math.round(clamp(r, 0, 1) * 255), Math.round(clamp(g, 0, 1) * 255), Math.round(clamp(b, 0, 1) * 255)];
  }

  function xyz_to_srgb(xyz) {
    let r = dotproduct(D65_XYZ_RGB[0], xyz);
    let g = dotproduct(D65_XYZ_RGB[1], xyz);
    let b = dotproduct(D65_XYZ_RGB[2], xyz);

    return linear_to_srgb([r, g, b]);
  }

  function reflectance_to_xyz(R) {
    let x = dotproduct(R, CIE_2012_CMF_X);
    let y = dotproduct(R, CIE_2012_CMF_Y);
    let z = dotproduct(R, CIE_2012_CMF_Z);

    return [x, y, z];
  }

  function linear_to_reflectance(lrgb) {
    let r = lrgb[0];
    let g = lrgb[1];
    let b = lrgb[2];

    let R = [];

    for (let i = 0; i < SIZE; i++) {
      R.push(r * SPD_RED[i] + g * SPD_GREEN[i] + b * SPD_BLUE[i]);
    }

    return R;
  }

  function lerp(a, b, alpha) {
    return a + alpha * (b - a);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function dotproduct(a, b) {
    return a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
  }

  function webgl_color(c) {
    let rgba = unpack(c);

    return [rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3] > 1 ? rgba[3] / 255 : rgba[3]];
  }

  function unpack(c) {
    if (Array.isArray(c)) {
      if (c.length === 3 || c.length === 4) {
        return [c[0], c[1], c[2], c[3] !== undefined ? c[3] : 1];
      } else {
        return [0, 0, 0, 1];
      }
    }

    let m = c.match(/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6,8})$/) || c.match(/^rgba?\(\s*(\d+%?)\s*,\s*(\d+%?)\s*,\s*(\d+%?)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (m) {
      const f = m[1] ? 16 : 10;
      const b = m[1]
        ? m[1].length === 3 || m[1].length === 4
          ? m[1]
              .split('')
              .map((x) => x + x)
              .join('')
          : m[1]
        : m
            .slice(1, 4)
            .map((v) => (v.endsWith('%') ? Math.round(parseFloat(v) * 2.55) : parseInt(v)))
            .join('');
      const a = m[1] && (m[1].length === 4 || m[1].length === 8) ? parseInt(b.slice(6, 8), 16) / 255 : m[4] ? parseFloat(m[4]) : 1;
      return [parseInt(b.slice(0, 2), f), parseInt(b.slice(2, 4), f), parseInt(b.slice(4, 6), f), a];
    }

    return [0, 0, 0, 1];
  }

  function pack(srgb, returnFormat) {
    let r = srgb[0];
    let g = srgb[1];
    let b = srgb[2];
    let a = srgb[3];

    if (returnFormat === RGB || returnFormat === RGBA) {
      return `rgb${returnFormat === RGBA ? 'a' : ''}(${r}, ${g}, ${b}${returnFormat === RGBA ? ', ' + a : ''})`;
    }

    r = r.toString(16);
    g = g.toString(16);
    b = b.toString(16);
    a = (a > 1 ? a : a * 255).toString(16);

    if (r.length == 1) r = '0' + r;
    if (g.length == 1) g = '0' + g;
    if (b.length == 1) b = '0' + b;
    if (a.length == 1) a = '0' + a;

    return `#${r}${g}${b}${returnFormat === HEXA ? a : ''}`;
  }

  // K1 and K2 are used for the Saunderson correction which is used for how the color looks behind a refractive
  // surface like glass
  //
  // 1 is used for a vacuum, no surface
  //
  // Refractive Index
  //
  // https://en.wikipedia.org/wiki/Refractive_index
  // https://en.wikipedia.org/wiki/List_of_refractive_indices
  //
  // Glass = 1.5
  // Vacuum = 1

  const RI = 1;
  const K1 = Math.pow(RI - 1, 2) / Math.pow(RI + 1, 2);

  // 0 = neutral, - = lighten, + = darken
  const K2 = 0;

  const SPD_RED = [
    0.03065266, 0.03065266, 0.03012503, 0.0283744, 0.02443079, 0.01900359, 0.01345743, 0.00905147, 0.00606943, 0.0041924, 0.00300621, 0.00229452, 0.00190474, 0.00175435,
    0.00182349, 0.00218287, 0.00308472, 0.00539517, 0.01275154, 0.04939664, 0.41424516, 0.89425217, 0.95202201, 0.96833286, 0.97175685, 0.97320302, 0.97387285, 0.97418395,
    0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335,
  ];

  const SPD_GREEN = [
    0.00488428, 0.00488428, 0.00489302, 0.00505932, 0.00552416, 0.00668451, 0.00966823, 0.01843871, 0.05369084, 0.30997719, 0.84166297, 0.95140393, 0.97711658, 0.98538119,
    0.98819579, 0.98842729, 0.98651266, 0.98125477, 0.96796653, 0.9212632, 0.54678757, 0.07097922, 0.02151275, 0.01120932, 0.00778212, 0.00633303, 0.00566048, 0.00534751,
    0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568,
  ];

  const SPD_BLUE = [
    0.96446343, 0.96446661, 0.96499804, 0.96660443, 0.97009698, 0.97438902, 0.97695626, 0.97257598, 0.94029002, 0.68585683, 0.1553392, 0.04629964, 0.02096763, 0.01284767,
    0.00996131, 0.00937163, 0.01038752, 0.0133401, 0.01927821, 0.02934328, 0.03897609, 0.03478168, 0.02647979, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109,
    0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109,
  ];

  const CIE_2012_CMF_X = [
    0.00013656, 0.00131637, 0.00640948, 0.01643026, 0.02407799, 0.03573573, 0.03894236, 0.03004572, 0.0186094, 0.0074502, 0.00129006, 0.00052314, 0.00344737, 0.01065677,
    0.02169564, 0.03395004, 0.04732762, 0.06029657, 0.07284094, 0.08385845, 0.08612109, 0.08746894, 0.07951403, 0.06405614, 0.04521591, 0.03062648, 0.01838938, 0.0104432,
    0.00576692, 0.00279715, 0.00119535, 0.00059496, 0.00029365, 0.000115, 0.00006279, 0.00003275, 0.00001376,
  ];

  const CIE_2012_CMF_Y = [
    0.00001886, 0.0001814, 0.00080632, 0.00203723, 0.00344701, 0.00662872, 0.01029015, 0.01410577, 0.0194424, 0.02631783, 0.03273183, 0.04424704, 0.057012, 0.06907721, 0.08047999,
    0.08541136, 0.08725039, 0.08416902, 0.07860677, 0.07114656, 0.0590749, 0.05050107, 0.04005938, 0.02932589, 0.01939909, 0.01258803, 0.00734245, 0.00409671, 0.00223674,
    0.00107927, 0.00046015, 0.00022887, 0.000113, 0.00004432, 0.00002425, 0.00001268, 0.00000535,
  ];

  const CIE_2012_CMF_Z = [
    0.00060998, 0.00595953, 0.02967913, 0.07855475, 0.11921905, 0.18425721, 0.21077492, 0.1763428, 0.12741269, 0.0737491, 0.03663768, 0.01923495, 0.00807728, 0.00335702,
    0.00140323, 0.00053757, 0.00020463, 0.00007431, 0.00002725, 0.00001053, 0.00000391, 0.00000166, 0.00000072, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0,
  ];

  const D65_XYZ_RGB = [
    [3.24306333, -1.53837619, -0.49893282],
    [-0.96896309, 1.87542451, 0.04154303],
    [0.05568392, -0.20417438, 1.05799454],
  ];

  const D65_RGB_XYZ = [
    [0.4121246, 0.35768787, 0.18030627],
    [0.21250175, 0.71537574, 0.07212251],
    [0.01931834, 0.11922929, 0.94961304],
  ];

  function webgl_vertex() {
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

  function webgl_fragment() {
    return `
#ifdef GL_ES
precision lowp float;
#endif

uniform vec2 u_resolution;
uniform vec4 u_color1;
uniform vec4 u_color2;

const int SIZE = 37;
const float GAMMA = 2.4;
const float EPSILON = 0.00000001;

float uncompand(float x) {
  return (x < 0.04045) ? x / 12.92 : pow((x + 0.055) / 1.055, GAMMA);
}

float compand(float x) {
  return (x < 0.0031308) ? x * 12.92 : 1.055 * pow(x, 1.0 / GAMMA) - 0.055;
}

vec3 srgb_to_linear(vec3 srgb) {
    //add epsilon to prevent division by zero
    return vec3(uncompand(srgb[0] + EPSILON), uncompand(srgb[1] + EPSILON), uncompand(srgb[2] + EPSILON));
}

vec3 linear_to_srgb(vec3 lrgb) {
    //remove epsilon
    return clamp(vec3(compand(lrgb[0] - EPSILON), compand(lrgb[1] - EPSILON), compand(lrgb[2] - EPSILON)), 0.0, 1.0);
}

void linear_to_reflectance(vec3 lrgb, inout float R[SIZE]) {
     R[0] = dot(vec3(0.03065266, 0.00488428, 0.96446343), lrgb);
     R[1] = dot(vec3(0.03065266, 0.00488428, 0.96446661), lrgb);
     R[2] = dot(vec3(0.03012503, 0.00489302, 0.96499804), lrgb);
     R[3] = dot(vec3(0.02837440, 0.00505932, 0.96660443), lrgb);
     R[4] = dot(vec3(0.02443079, 0.00552416, 0.97009698), lrgb);
     R[5] = dot(vec3(0.01900359, 0.00668451, 0.97438902), lrgb);
     R[6] = dot(vec3(0.01345743, 0.00966823, 0.97695626), lrgb);
     R[7] = dot(vec3(0.00905147, 0.01843871, 0.97257598), lrgb);
     R[8] = dot(vec3(0.00606943, 0.05369084, 0.94029002), lrgb);
     R[9] = dot(vec3(0.00419240, 0.30997719, 0.68585683), lrgb);
    R[10] = dot(vec3(0.00300621, 0.84166297, 0.15533920), lrgb);
    R[11] = dot(vec3(0.00229452, 0.95140393, 0.04629964), lrgb);
    R[12] = dot(vec3(0.00190474, 0.97711658, 0.02096763), lrgb);
    R[13] = dot(vec3(0.00175435, 0.98538119, 0.01284767), lrgb);
    R[14] = dot(vec3(0.00182349, 0.98819579, 0.00996131), lrgb);
    R[15] = dot(vec3(0.00218287, 0.98842729, 0.00937163), lrgb);
    R[16] = dot(vec3(0.00308472, 0.98651266, 0.01038752), lrgb);
    R[17] = dot(vec3(0.00539517, 0.98125477, 0.01334010), lrgb);
    R[18] = dot(vec3(0.01275154, 0.96796653, 0.01927821), lrgb);
    R[19] = dot(vec3(0.04939664, 0.92126320, 0.02934328), lrgb);
    R[20] = dot(vec3(0.41424516, 0.54678757, 0.03897609), lrgb);
    R[21] = dot(vec3(0.89425217, 0.07097922, 0.03478168), lrgb);
    R[22] = dot(vec3(0.95202201, 0.02151275, 0.02647979), lrgb);
    R[23] = dot(vec3(0.96833286, 0.01120932, 0.02047109), lrgb);
    R[24] = dot(vec3(0.97175685, 0.00778212, 0.02047109), lrgb);
    R[25] = dot(vec3(0.97320302, 0.00633303, 0.02047109), lrgb);
    R[26] = dot(vec3(0.97387285, 0.00566048, 0.02047109), lrgb);
    R[27] = dot(vec3(0.97418395, 0.00534751, 0.02047109), lrgb);
    R[28] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
    R[29] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
    R[30] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
    R[31] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
    R[32] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
    R[33] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
    R[34] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
    R[35] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
    R[36] = dot(vec3(0.97432335, 0.00520568, 0.02047109), lrgb);
}

vec3 xyz_to_srgb(vec3 xyz) {
    mat3 D65_XYZ_RGB;

    D65_XYZ_RGB[0] = vec3( 3.24306333, -1.53837619, -0.49893282);
    D65_XYZ_RGB[1] = vec3(-0.96896309,  1.87542451,  0.04154303);
    D65_XYZ_RGB[2] = vec3( 0.05568392, -0.20417438,  1.05799454);
    
    float r = dot(D65_XYZ_RGB[0], xyz);
    float g = dot(D65_XYZ_RGB[1], xyz);
    float b = dot(D65_XYZ_RGB[2], xyz);

    return linear_to_srgb(vec3(r, g, b));
}

vec3 reflectance_to_xyz(float R[SIZE]) {
    vec3 xyz = vec3(0.0);
    
    xyz +=  R[0] * vec3(0.00013656, 0.00001886, 0.00060998);
    xyz +=  R[1] * vec3(0.00131637, 0.00018140, 0.00595953);
    xyz +=  R[2] * vec3(0.00640948, 0.00080632, 0.02967913);
    xyz +=  R[3] * vec3(0.01643026, 0.00203723, 0.07855475);
    xyz +=  R[4] * vec3(0.02407799, 0.00344701, 0.11921905);
    xyz +=  R[5] * vec3(0.03573573, 0.00662872, 0.18425721);
    xyz +=  R[6] * vec3(0.03894236, 0.01029015, 0.21077492);
    xyz +=  R[7] * vec3(0.03004572, 0.01410577, 0.17634280);
    xyz +=  R[8] * vec3(0.01860940, 0.01944240, 0.12741269);
    xyz +=  R[9] * vec3(0.00745020, 0.02631783, 0.07374910);
    xyz += R[10] * vec3(0.00129006, 0.03273183, 0.03663768);
    xyz += R[11] * vec3(0.00052314, 0.04424704, 0.01923495);
    xyz += R[12] * vec3(0.00344737, 0.05701200, 0.00807728);
    xyz += R[13] * vec3(0.01065677, 0.06907721, 0.00335702);
    xyz += R[14] * vec3(0.02169564, 0.08047999, 0.00140323);
    xyz += R[15] * vec3(0.03395004, 0.08541136, 0.00053757);
    xyz += R[16] * vec3(0.04732762, 0.08725039, 0.00020463);
    xyz += R[17] * vec3(0.06029657, 0.08416902, 0.00007431);
    xyz += R[18] * vec3(0.07284094, 0.07860677, 0.00002725);
    xyz += R[19] * vec3(0.08385845, 0.07114656, 0.00001053);
    xyz += R[20] * vec3(0.08612109, 0.05907490, 0.00000391);
    xyz += R[21] * vec3(0.08746894, 0.05050107, 0.00000166);
    xyz += R[22] * vec3(0.07951403, 0.04005938, 0.00000072);
    xyz += R[23] * vec3(0.06405614, 0.02932589, 0.00000000);
    xyz += R[24] * vec3(0.04521591, 0.01939909, 0.00000000);
    xyz += R[25] * vec3(0.03062648, 0.01258803, 0.00000000);
    xyz += R[26] * vec3(0.01838938, 0.00734245, 0.00000000);
    xyz += R[27] * vec3(0.01044320, 0.00409671, 0.00000000);
    xyz += R[28] * vec3(0.00576692, 0.00223674, 0.00000000);
    xyz += R[29] * vec3(0.00279715, 0.00107927, 0.00000000);
    xyz += R[30] * vec3(0.00119535, 0.00046015, 0.00000000);
    xyz += R[31] * vec3(0.00059496, 0.00022887, 0.00000000);
    xyz += R[32] * vec3(0.00029365, 0.00011300, 0.00000000);
    xyz += R[33] * vec3(0.00011500, 0.00004432, 0.00000000);
    xyz += R[34] * vec3(0.00006279, 0.00002425, 0.00000000);
    xyz += R[35] * vec3(0.00003275, 0.00001268, 0.00000000);
    xyz += R[36] * vec3(0.00001376, 0.00000535, 0.00000000);

    return xyz;
}

float linear_to_concentration(float l1, float l2, float t) {
    float t1 = l1 * pow(1.0 - t, 2.0);
    float t2 = l2 * pow(t, 2.0);

    return t2 / (t1 + t2);
}

float luminance(vec3 color) {
    //D65 Y
    return dot(vec3(0.21250175, 0.71537574, 0.07212251), color);
}

vec3 spectral_mix(vec3 color1, vec3 color2, float t) {
    vec3 lrgb1 = srgb_to_linear(color1);
    vec3 lrgb2 = srgb_to_linear(color2);

    float l1 = luminance(lrgb1);
    float l2 = luminance(lrgb2);

    t = linear_to_concentration(l1, l2, t);

    float R1[SIZE];
    float R2[SIZE];

    linear_to_reflectance(lrgb1, R1);
    linear_to_reflectance(lrgb2, R2);

    float R[SIZE];

    for (int i = 0; i < SIZE; i++) {
      float KS = 0.0;

      KS += (1.0 - t) * (pow(1.0 - R1[i], 2.0) / (2.0 * R1[i]));
      KS += t * (pow(1.0 - R2[i], 2.0) / (2.0 * R2[i]));

      float KM = 1.0 + KS - sqrt(pow(KS, 2.0) + 2.0 * KS);

      //Saunderson correction
      // let S = ((1.0 - K1) * (1.0 - K2) * KM) / (1.0 - K2 * KM);

      R[i] = KM;
    }

    return xyz_to_srgb(reflectance_to_xyz(R));
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;

    st.y = 1.0 - st.y;

    vec3 col = spectral_mix(u_color1.rgb, u_color2.rgb, st.x); 

    gl_FragColor = vec4(col, mix(u_color1.a, u_color2.a, st.x));
}
    `;
  }

  function webgl2_vertex() {
    return `#version 300 es

in vec3 aPosition;

void main(){
    vec4 positionVec4 = vec4(aPosition, 1.0);

    positionVec4.xy = positionVec4.xy * 2.0 - 1.0; 

    gl_Position = positionVec4;
}
    `;
  }

  function webgl2_fragment() {
    return `#version 300 es

#ifdef GL_ES
precision mediump float;
#endif

in vec2 u_resolution;
in vec4 u_color1;
in vec4 u_color2;

out vec4 o_col;

const int SIZE = 37;
const float GAMMA = 2.4;
const float EPSILON = 0.00000001;

const float SPD_RED[SIZE] = float[SIZE](
    0.03065266, 0.03065266, 0.03012503, 0.0283744, 0.02443079, 0.01900359, 0.01345743, 0.00905147, 0.00606943, 0.0041924, 0.00300621, 0.00229452, 0.00190474, 0.00175435,
    0.00182349, 0.00218287, 0.00308472, 0.00539517, 0.01275154, 0.04939664, 0.41424516, 0.89425217, 0.95202201, 0.96833286, 0.97175685, 0.97320302, 0.97387285, 0.97418395,
    0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335, 0.97432335
);

const float SPD_GREEN[SIZE] = float[SIZE](
    0.00488428, 0.00488428, 0.00489302, 0.00505932, 0.00552416, 0.00668451, 0.00966823, 0.01843871, 0.05369084, 0.30997719, 0.84166297, 0.95140393, 0.97711658, 0.98538119,
    0.98819579, 0.98842729, 0.98651266, 0.98125477, 0.96796653, 0.9212632, 0.54678757, 0.07097922, 0.02151275, 0.01120932, 0.00778212, 0.00633303, 0.00566048, 0.00534751,
    0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568, 0.00520568
);

const float SPD_BLUE[SIZE] = float[SIZE](
    0.96446343, 0.96446661, 0.96499804, 0.96660443, 0.97009698, 0.97438902, 0.97695626, 0.97257598, 0.94029002, 0.68585683, 0.1553392, 0.04629964, 0.02096763, 0.01284767,
    0.00996131, 0.00937163, 0.01038752, 0.0133401, 0.01927821, 0.02934328, 0.03897609, 0.03478168, 0.02647979, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109,
    0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109, 0.02047109
);

const float CIE_2012_CMF_X[SIZE] = float[SIZE](
    0.00013656, 0.00131637, 0.00640948, 0.01643026, 0.02407799, 0.03573573, 0.03894236, 0.03004572, 0.0186094, 0.0074502, 0.00129006, 0.00052314, 0.00344737, 0.01065677,
    0.02169564, 0.03395004, 0.04732762, 0.06029657, 0.07284094, 0.08385845, 0.08612109, 0.08746894, 0.07951403, 0.06405614, 0.04521591, 0.03062648, 0.01838938, 0.0104432,
    0.00576692, 0.00279715, 0.00119535, 0.00059496, 0.00029365, 0.000115, 0.00006279, 0.00003275, 0.00001376
);

const float CIE_2012_CMF_Y[SIZE] = float[SIZE](
    0.00001886, 0.0001814, 0.00080632, 0.00203723, 0.00344701, 0.00662872, 0.01029015, 0.01410577, 0.0194424, 0.02631783, 0.03273183, 0.04424704, 0.057012, 0.06907721, 0.08047999,
    0.08541136, 0.08725039, 0.08416902, 0.07860677, 0.07114656, 0.0590749, 0.05050107, 0.04005938, 0.02932589, 0.01939909, 0.01258803, 0.00734245, 0.00409671, 0.00223674,
    0.00107927, 0.00046015, 0.00022887, 0.000113, 0.00004432, 0.00002425, 0.00001268, 0.00000535
);

const float CIE_2012_CMF_Z[SIZE] = float[SIZE](
    0.00060998, 0.00595953, 0.02967913, 0.07855475, 0.11921905, 0.18425721, 0.21077492, 0.1763428, 0.12741269, 0.0737491, 0.03663768, 0.01923495, 0.00807728, 0.00335702,
    0.00140323, 0.00053757, 0.00020463, 0.00007431, 0.00002725, 0.00001053, 0.00000391, 0.00000166, 0.00000072, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
    0.0
);

const mat3 D65_XYZ_RGB = mat3(
    vec3(3.24306333, -1.53837619, -0.49893282),
    vec3(-0.96896309, 1.87542451, 0.04154303),
    vec3(0.05568392, -0.20417438, 1.05799454)
);

const mat3 D65_RGB_XYZ = mat3(
    vec3(0.4121246, 0.35768787, 0.18030627),
    vec3(0.21250175, 0.71537574, 0.07212251),
    vec3(0.01931834, 0.11922929, 0.94961304)
);

float uncompand(float x) {
  return (x < 0.04045) ? x / 12.92 : pow((x + 0.055) / 1.055, GAMMA);
}

float compand(float x) {
  return (x < 0.0031308) ? x * 12.92 : 1.055 * pow(x, 1.0 / GAMMA) - 0.055;
}

vec3 srgb_to_linear(vec3 srgb) {
    //add epsilon to prevent division by zero
    return vec3(uncompand(srgb[0] + EPSILON), uncompand(srgb[1] + EPSILON), uncompand(srgb[2] + EPSILON));
}

vec3 linear_to_srgb(vec3 lrgb) {
    //remove epsilon
    return clamp(vec3(compand(lrgb[0] - EPSILON), compand(lrgb[1] - EPSILON), compand(lrgb[2] - EPSILON)), 0.0, 1.0);
}

void linear_to_reflectance(vec3 lrgb, inout float R[SIZE]) {
    for (int i = 0; i < SIZE; i++) {
      R[i] = dot(vec3(SPD_RED[i], SPD_GREEN[i], SPD_BLUE[i]), lrgb);
    }
}

vec3 xyz_to_srgb(vec3 xyz) {
    float r = dot(D65_XYZ_RGB[0], xyz);
    float g = dot(D65_XYZ_RGB[1], xyz);
    float b = dot(D65_XYZ_RGB[2], xyz);

    return linear_to_srgb(vec3(r, g, b));
}

vec3 reflectance_to_xyz(float R[SIZE]) {
    vec3 xyz;

    for (int i = 0; i < SIZE; i++) {
      xyz[0] += dot(R[i], CIE_2012_CMF_X[i]);
      xyz[1] += dot(R[i], CIE_2012_CMF_Y[i]);
      xyz[2] += dot(R[i], CIE_2012_CMF_Z[i]);
    }

    return xyz;
}

float linear_to_concentration(float l1, float l2, float t) {
    float t1 = l1 * pow(1.0 - t, 2.0);
    float t2 = l2 * pow(t, 2.0);

    return t2 / (t1 + t2);
}

float luminance(vec3 color) {
    return dot(D65_RGB_XYZ[1], color);
}

vec3 spectral_mix(vec3 color1, vec3 color2, float t) {
    vec3 lrgb1 = srgb_to_linear(color1);
    vec3 lrgb2 = srgb_to_linear(color2);

    float l1 = luminance(lrgb1);
    float l2 = luminance(lrgb2);

    t = linear_to_concentration(l1, l2, t);

    float R1[SIZE];
    float R2[SIZE];

    linear_to_reflectance(lrgb1, R1);
    linear_to_reflectance(lrgb2, R2);

    float R[SIZE];

    for (int i = 0; i < SIZE; i++) {
      float KS = 0.0;

      KS += (1.0 - t) * (pow(1.0 - R1[i], 2.0) / (2.0 * R1[i]));
      KS += t * (pow(1.0 - R2[i], 2.0) / (2.0 * R2[i]));

      float KM = 1.0 + KS - sqrt(pow(KS, 2.0) + 2.0 * KS);

      //Saunderson correction
      // let S = ((1.0 - K1) * (1.0 - K2) * KM) / (1.0 - K2 * KM);

      R[i] = KM;
    }

    return xyz_to_srgb(reflectance_to_xyz(R));
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;

    st.y = 1.0 - st.y;

    vec3 col = spectral_mix(u_color1.rgb, u_color2.rgb, st.x); 

    o_col = vec4(col, mix(u_color1.a, u_color2.a, st.x));
}
    `;
  }

  exports.RGB = RGB;
  exports.RGBA = RGBA;
  exports.HEX = HEX;
  exports.HEXA = HEXA;

  exports.mix = mix;
  exports.palette = palette;
  exports.webgl_color = webgl_color;
  exports.webgl_vertex = webgl_vertex;
  exports.webgl_fragment = webgl_fragment;
  exports.webgl2_vertex = webgl2_vertex;
  exports.webgl2_fragment = webgl2_fragment;
});
