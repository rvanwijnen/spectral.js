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

  const SIZE = 38;
  const GAMMA = 2.4;
  const EPSILON = 0.00000001;

  function linear_to_concentration(l1, l2, t) {
    let t1 = l1 * (1 - t) ** 2;
    let t2 = l2 * t ** 2;

    return t2 / (t1 + t2);
  }

  function mix(color1, color2, t, returnFormat) {
    color1 = unpack(color1);
    color2 = unpack(color2);

    let lrgb1 = srgb_to_linear(color1);
    let lrgb2 = srgb_to_linear(color2);

    let R1 = linear_to_reflectance(lrgb1);
    let R2 = linear_to_reflectance(lrgb2);

    let l1 = dotproduct(R1, CIE_CMF_Y);
    let l2 = dotproduct(R2, CIE_CMF_Y);

    t = linear_to_concentration(l1, l2, t);

    const R = new Array(SIZE);

    for (let i = 0; i < SIZE; i++) {
      let KS = (1 - t) * ((1 - R1[i]) ** 2 / (2 * R1[i])) + t * ((1 - R2[i]) ** 2 / (2 * R2[i]));
      let KM = 1 + KS - Math.sqrt(KS ** 2 + 2 * KS);

      //Saunderson correction
      // let S = ((1.0 - K1) * (1.0 - K2) * KM) / (1.0 - K2 * KM);

      R[i] = KM;
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

  function uncompand(x) {
    return x < 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** GAMMA;
  }

  function compand(x) {
    return x < 0.0031308 ? x * 12.92 : 1.055 * x ** (1.0 / GAMMA) - 0.055;
  }

  function srgb_to_linear(srgb) {
    let r = uncompand(srgb[0] / 255.0);
    let g = uncompand(srgb[1] / 255.0);
    let b = uncompand(srgb[2] / 255.0);

    return [r, g, b];
  }

  function linear_to_srgb(lrgb) {
    let r = compand(lrgb[0]);
    let g = compand(lrgb[1]);
    let b = compand(lrgb[2]);

    return [Math.round(clamp(r, 0, 1) * 255), Math.round(clamp(g, 0, 1) * 255), Math.round(clamp(b, 0, 1) * 255)];
  }

  function xyz_to_srgb(xyz) {
    let r = dotproduct(XYZ_RGB[0], xyz);
    let g = dotproduct(XYZ_RGB[1], xyz);
    let b = dotproduct(XYZ_RGB[2], xyz);

    return linear_to_srgb([r, g, b]);
  }

  function reflectance_to_xyz(R) {
    let x = dotproduct(R, CIE_CMF_X);
    let y = dotproduct(R, CIE_CMF_Y);
    let z = dotproduct(R, CIE_CMF_Z);

    return [x, y, z];
  }

  function spectral_upsampling(lrgb) {
    let w = Math.min(Math.min(lrgb[0], lrgb[1]), lrgb[2]);

    lrgb = [lrgb[0] - w, lrgb[1] - w, lrgb[2] - w];

    let c = Math.min(lrgb[1], lrgb[2]);
    let m = Math.min(lrgb[0], lrgb[2]);
    let y = Math.min(lrgb[0], lrgb[1]);
    let r = Math.max(0, Math.min(lrgb[0] - lrgb[2], lrgb[0] - lrgb[1]));
    let g = Math.max(0, Math.min(lrgb[1] - lrgb[2], lrgb[1] - lrgb[0]));
    let b = Math.max(0, Math.min(lrgb[2] - lrgb[1], lrgb[2] - lrgb[0]));

    return [w, c, m, y, r, g, b];
  }

  function linear_to_reflectance(lrgb) {
    let weights = spectral_upsampling(lrgb);

    const R = new Array(SIZE);

    for (let i = 0; i < SIZE; i++) {
      R[i] = Math.max(
        EPSILON,
        weights[0] + weights[1] * SPD_C[i] + weights[2] * SPD_M[i] + weights[3] * SPD_Y[i] + weights[4] * SPD_R[i] + weights[5] * SPD_G[i] + weights[6] * SPD_B[i]
      );
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

  function glsl_color(c) {
    let rgba = unpack(c);

    return [rgba[0] / 255, rgba[1] / 255, rgba[2] / 255, rgba[3] > 1 ? rgba[3] / 255 : rgba[3]];
  }

  function unpack(color) {
    if (Array.isArray(color)) {
      const [r, g, b, a = 1] = color;

      return [r, g, b, a];
    }

    if (color.startsWith('rgb')) {
      color = color
        .slice(color.indexOf('(') + 1, -1)
        .split(',')
        .map((value) => (value.trim().endsWith('%') ? Math.round(parseFloat(value.trim()) * 2.55) : Number(value.trim())));

      const [r, g, b, a = 1] = color;

      return [r, g, b, a];
    }

    if (color.startsWith('#')) {
      if (color.length === 4 || color.length === 5) {
        color = color
          .split('')
          .slice(1)
          .map((value) => value + value)
          .join('');
      } else {
        color = color.slice(1);
      }

      color = color.match(/.{1,2}/g).map((value) => parseInt(value, 16));

      const [r, g, b, a = 1] = color.length === 3 ? [...color, 1] : color;

      return [r, g, b, a];
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
    a = (a > 1 ? a : Math.round(clamp(a, 0, 1) * 255)).toString(16);

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

  const RI = 1.0;
  const K1 = (RI - 1) ** 2 / (RI + 1) ** 2;

  // 0 = neutral, - = lighten, + = darken
  const K2 = 0;

  const SPD_C = [
    0.96853629, 0.96855103, 0.96859338, 0.96877345, 0.96942204, 0.97143709, 0.97541862, 0.98074186, 0.98580992, 0.98971194, 0.99238027, 0.99409844, 0.995172, 0.99576545,
    0.99593552, 0.99564041, 0.99464769, 0.99229579, 0.98638762, 0.96829712, 0.89228016, 0.53740239, 0.15360445, 0.05705719, 0.03126539, 0.02205445, 0.01802271, 0.0161346,
    0.01520947, 0.01475977, 0.01454263, 0.01444459, 0.01439897, 0.0143762, 0.01436343, 0.01435687, 0.0143537, 0.01435408,
  ];

  const SPD_M = [
    0.51567122, 0.5401552, 0.62645502, 0.75595012, 0.92826996, 0.97223624, 0.98616174, 0.98955255, 0.98676237, 0.97312575, 0.91944277, 0.32564851, 0.13820628, 0.05015143,
    0.02912336, 0.02421691, 0.02660696, 0.03407586, 0.04835936, 0.0001172, 0.00008554, 0.85267882, 0.93188793, 0.94810268, 0.94200977, 0.91478045, 0.87065445, 0.78827548,
    0.65738359, 0.59909403, 0.56817268, 0.54031997, 0.52110241, 0.51041094, 0.50526577, 0.5025508, 0.50126452, 0.50083021,
  ];

  const SPD_Y = [
    0.02055257, 0.02059936, 0.02062723, 0.02073387, 0.02114202, 0.02233154, 0.02556857, 0.03330189, 0.05185294, 0.10087639, 0.24000413, 0.53589066, 0.79874659, 0.91186529,
    0.95399623, 0.97137099, 0.97939505, 0.98345207, 0.98553736, 0.98648905, 0.98674535, 0.98657555, 0.98611877, 0.98559942, 0.98507063, 0.98460039, 0.98425301, 0.98403909,
    0.98388535, 0.98376116, 0.98368246, 0.98365023, 0.98361309, 0.98357259, 0.98353856, 0.98351247, 0.98350101, 0.98350852,
  ];

  const SPD_R = [
    0.03147571, 0.03146636, 0.03140624, 0.03119611, 0.03053888, 0.02856855, 0.02459485, 0.0192952, 0.01423112, 0.01033111, 0.00765876, 0.00593693, 0.00485616, 0.00426186,
    0.00409039, 0.00438375, 0.00537525, 0.00772962, 0.0136612, 0.03181352, 0.10791525, 0.46249516, 0.84604333, 0.94275572, 0.96860996, 0.97783966, 0.98187757, 0.98377315,
    0.98470202, 0.98515481, 0.98537114, 0.98546685, 0.98550011, 0.98551031, 0.98550741, 0.98551323, 0.98551563, 0.98551547,
  ];

  const SPD_G = [
    0.49108579, 0.46944057, 0.4016578, 0.2449042, 0.0682688, 0.02732883, 0.013606, 0.01000187, 0.01284127, 0.02636635, 0.07058713, 0.70421692, 0.85473994, 0.95081565, 0.9717037,
    0.97651888, 0.97429245, 0.97012917, 0.9425863, 0.99989207, 0.99989891, 0.13823139, 0.06968113, 0.05628787, 0.06111561, 0.08987709, 0.13656016, 0.22169624, 0.32176956,
    0.36157329, 0.4836192, 0.46488579, 0.47440306, 0.4857699, 0.49267971, 0.49625685, 0.49807754, 0.49889859,
  ];

  const SPD_B = [
    0.97901834, 0.97901649, 0.97901118, 0.97892146, 0.97858555, 0.97743705, 0.97428075, 0.96663223, 0.94822893, 0.89937713, 0.76070164, 0.4642044, 0.20123039, 0.08808402,
    0.04592894, 0.02860373, 0.02060067, 0.01656701, 0.01451549, 0.01357964, 0.01331243, 0.01347661, 0.01387181, 0.01435472, 0.01479836, 0.0151525, 0.01540513, 0.01557233,
    0.0156571, 0.01571025, 0.01571916, 0.01572133, 0.01572502, 0.01571717, 0.01571905, 0.01571059, 0.01569728, 0.0157002,
  ];

  const CIE_CMF_X = [
    0.00006469, 0.00021941, 0.00112057, 0.00376661, 0.01188055, 0.02328644, 0.03455942, 0.03722379, 0.03241838, 0.02123321, 0.01049099, 0.00329584, 0.00050704, 0.00094867,
    0.00627372, 0.01686462, 0.02868965, 0.04267481, 0.05625475, 0.0694704, 0.08305315, 0.0861261, 0.09046614, 0.08500387, 0.07090667, 0.05062889, 0.03547396, 0.02146821,
    0.01251646, 0.00680458, 0.00346457, 0.00149761, 0.0007697, 0.00040737, 0.00016901, 0.00009522, 0.00004903, 0.00002,
  ];

  const CIE_CMF_Y = [
    0.00000184, 0.00000621, 0.00003101, 0.00010475, 0.00035364, 0.00095147, 0.00228226, 0.00420733, 0.0066888, 0.0098884, 0.01524945, 0.02141831, 0.03342293, 0.05131001,
    0.07040208, 0.08783871, 0.09424905, 0.09795667, 0.09415219, 0.08678102, 0.07885653, 0.0635267, 0.05374142, 0.04264606, 0.03161735, 0.02088521, 0.01386011, 0.00810264,
    0.0046301, 0.00249138, 0.0012593, 0.00054165, 0.00027795, 0.00014711, 0.00006103, 0.00003439, 0.00001771, 0.00000722,
  ];

  const CIE_CMF_Z = [
    0.00030502, 0.00103681, 0.00531314, 0.01795439, 0.05707758, 0.11365162, 0.17335873, 0.19620658, 0.18608237, 0.13995048, 0.08917453, 0.04789621, 0.02814563, 0.01613766,
    0.0077591, 0.00429615, 0.00200551, 0.00086147, 0.00036904, 0.00019143, 0.00014956, 0.00009231, 0.00006813, 0.00002883, 0.00001577, 0.00000394, 0.00000158, 0.0, 0.0, 0.0, 0.0,
    0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  ];

  const XYZ_RGB = [
    [3.24306333, -1.53837619, -0.49893282],
    [-0.96896309, 1.87542451, 0.04154303],
    [0.05568392, -0.20417438, 1.05799454],
  ];

  function glsl() {
    return `
#ifndef SPECTRAL
#define SPECTRAL

const int SPECTRAL_SIZE = 38;
const float SPECTRAL_GAMMA = 2.4;
const float SPECTRAL_EPSILON = 0.0001;

float spectral_uncompand(float x) {
  return (x < 0.04045) ? x / 12.92 : pow((x + 0.055) / 1.055, SPECTRAL_GAMMA);
}

float spectral_compand(float x) {
  return (x < 0.0031308) ? x * 12.92 : 1.055 * pow(x, 1.0 / SPECTRAL_GAMMA) - 0.055;
}

vec3 spectral_srgb_to_linear(vec3 srgb) {
    return vec3(spectral_uncompand(srgb[0]), spectral_uncompand(srgb[1]), spectral_uncompand(srgb[2]));
}

vec3 spectral_linear_to_srgb(vec3 lrgb) {
    return clamp(vec3(spectral_compand(lrgb[0]), spectral_compand(lrgb[1]), spectral_compand(lrgb[2])), 0.0, 1.0);
}

void spectral_upsampling(vec3 lrgb, out float w, out float c, out float m, out float y, out float r, out float g, out float b) {
    w = min(lrgb.r, min(lrgb.g, lrgb.b));

    lrgb -= w;

    c = min(lrgb.g, lrgb.b);
    m = min(lrgb.r, lrgb.b);
    y = min(lrgb.r, lrgb.g);
    r = min(max(0., lrgb.r - lrgb.b), max(0., lrgb.r - lrgb.g));
    g = min(max(0., lrgb.g - lrgb.b), max(0., lrgb.g - lrgb.r));
    b = min(max(0., lrgb.b - lrgb.g), max(0., lrgb.b - lrgb.r));
}

void spectral_linear_to_reflectance(vec3 lrgb, inout float R[SPECTRAL_SIZE]) {
    float w, c, m, y, r, g, b;
    
    spectral_upsampling(lrgb, w, c, m, y, r, g, b);
    
     R[0] = max(SPECTRAL_EPSILON, w + c * 0.96853629 + m * 0.51567122 + y * 0.02055257 + r * 0.03147571 + g * 0.49108579 + b * 0.97901834);
     R[1] = max(SPECTRAL_EPSILON, w + c * 0.96855103 + m * 0.54015520 + y * 0.02059936 + r * 0.03146636 + g * 0.46944057 + b * 0.97901649);
     R[2] = max(SPECTRAL_EPSILON, w + c * 0.96859338 + m * 0.62645502 + y * 0.02062723 + r * 0.03140624 + g * 0.40165780 + b * 0.97901118);
     R[3] = max(SPECTRAL_EPSILON, w + c * 0.96877345 + m * 0.75595012 + y * 0.02073387 + r * 0.03119611 + g * 0.24490420 + b * 0.97892146);
     R[4] = max(SPECTRAL_EPSILON, w + c * 0.96942204 + m * 0.92826996 + y * 0.02114202 + r * 0.03053888 + g * 0.06826880 + b * 0.97858555);
     R[5] = max(SPECTRAL_EPSILON, w + c * 0.97143709 + m * 0.97223624 + y * 0.02233154 + r * 0.02856855 + g * 0.02732883 + b * 0.97743705);
     R[6] = max(SPECTRAL_EPSILON, w + c * 0.97541862 + m * 0.98616174 + y * 0.02556857 + r * 0.02459485 + g * 0.01360600 + b * 0.97428075);
     R[7] = max(SPECTRAL_EPSILON, w + c * 0.98074186 + m * 0.98955255 + y * 0.03330189 + r * 0.01929520 + g * 0.01000187 + b * 0.96663223);
     R[8] = max(SPECTRAL_EPSILON, w + c * 0.98580992 + m * 0.98676237 + y * 0.05185294 + r * 0.01423112 + g * 0.01284127 + b * 0.94822893);
     R[9] = max(SPECTRAL_EPSILON, w + c * 0.98971194 + m * 0.97312575 + y * 0.10087639 + r * 0.01033111 + g * 0.02636635 + b * 0.89937713);
    R[10] = max(SPECTRAL_EPSILON, w + c * 0.99238027 + m * 0.91944277 + y * 0.24000413 + r * 0.00765876 + g * 0.07058713 + b * 0.76070164);
    R[11] = max(SPECTRAL_EPSILON, w + c * 0.99409844 + m * 0.32564851 + y * 0.53589066 + r * 0.00593693 + g * 0.70421692 + b * 0.46420440);
    R[12] = max(SPECTRAL_EPSILON, w + c * 0.99517200 + m * 0.13820628 + y * 0.79874659 + r * 0.00485616 + g * 0.85473994 + b * 0.20123039);
    R[13] = max(SPECTRAL_EPSILON, w + c * 0.99576545 + m * 0.05015143 + y * 0.91186529 + r * 0.00426186 + g * 0.95081565 + b * 0.08808402);
    R[14] = max(SPECTRAL_EPSILON, w + c * 0.99593552 + m * 0.02912336 + y * 0.95399623 + r * 0.00409039 + g * 0.97170370 + b * 0.04592894);
    R[15] = max(SPECTRAL_EPSILON, w + c * 0.99564041 + m * 0.02421691 + y * 0.97137099 + r * 0.00438375 + g * 0.97651888 + b * 0.02860373);
    R[16] = max(SPECTRAL_EPSILON, w + c * 0.99464769 + m * 0.02660696 + y * 0.97939505 + r * 0.00537525 + g * 0.97429245 + b * 0.02060067);
    R[17] = max(SPECTRAL_EPSILON, w + c * 0.99229579 + m * 0.03407586 + y * 0.98345207 + r * 0.00772962 + g * 0.97012917 + b * 0.01656701);
    R[18] = max(SPECTRAL_EPSILON, w + c * 0.98638762 + m * 0.04835936 + y * 0.98553736 + r * 0.01366120 + g * 0.94258630 + b * 0.01451549);
    R[19] = max(SPECTRAL_EPSILON, w + c * 0.96829712 + m * 0.00011720 + y * 0.98648905 + r * 0.03181352 + g * 0.99989207 + b * 0.01357964);
    R[20] = max(SPECTRAL_EPSILON, w + c * 0.89228016 + m * 0.00008554 + y * 0.98674535 + r * 0.10791525 + g * 0.99989891 + b * 0.01331243);
    R[21] = max(SPECTRAL_EPSILON, w + c * 0.53740239 + m * 0.85267882 + y * 0.98657555 + r * 0.46249516 + g * 0.13823139 + b * 0.01347661);
    R[22] = max(SPECTRAL_EPSILON, w + c * 0.15360445 + m * 0.93188793 + y * 0.98611877 + r * 0.84604333 + g * 0.06968113 + b * 0.01387181);
    R[23] = max(SPECTRAL_EPSILON, w + c * 0.05705719 + m * 0.94810268 + y * 0.98559942 + r * 0.94275572 + g * 0.05628787 + b * 0.01435472);
    R[24] = max(SPECTRAL_EPSILON, w + c * 0.03126539 + m * 0.94200977 + y * 0.98507063 + r * 0.96860996 + g * 0.06111561 + b * 0.01479836);
    R[25] = max(SPECTRAL_EPSILON, w + c * 0.02205445 + m * 0.91478045 + y * 0.98460039 + r * 0.97783966 + g * 0.08987709 + b * 0.01515250);
    R[26] = max(SPECTRAL_EPSILON, w + c * 0.01802271 + m * 0.87065445 + y * 0.98425301 + r * 0.98187757 + g * 0.13656016 + b * 0.01540513);
    R[27] = max(SPECTRAL_EPSILON, w + c * 0.01613460 + m * 0.78827548 + y * 0.98403909 + r * 0.98377315 + g * 0.22169624 + b * 0.01557233);
    R[28] = max(SPECTRAL_EPSILON, w + c * 0.01520947 + m * 0.65738359 + y * 0.98388535 + r * 0.98470202 + g * 0.32176956 + b * 0.01565710);
    R[29] = max(SPECTRAL_EPSILON, w + c * 0.01475977 + m * 0.59909403 + y * 0.98376116 + r * 0.98515481 + g * 0.36157329 + b * 0.01571025);
    R[30] = max(SPECTRAL_EPSILON, w + c * 0.01454263 + m * 0.56817268 + y * 0.98368246 + r * 0.98537114 + g * 0.48361920 + b * 0.01571916);
    R[31] = max(SPECTRAL_EPSILON, w + c * 0.01444459 + m * 0.54031997 + y * 0.98365023 + r * 0.98546685 + g * 0.46488579 + b * 0.01572133);
    R[32] = max(SPECTRAL_EPSILON, w + c * 0.01439897 + m * 0.52110241 + y * 0.98361309 + r * 0.98550011 + g * 0.47440306 + b * 0.01572502);
    R[33] = max(SPECTRAL_EPSILON, w + c * 0.01437620 + m * 0.51041094 + y * 0.98357259 + r * 0.98551031 + g * 0.48576990 + b * 0.01571717);
    R[34] = max(SPECTRAL_EPSILON, w + c * 0.01436343 + m * 0.50526577 + y * 0.98353856 + r * 0.98550741 + g * 0.49267971 + b * 0.01571905);
    R[35] = max(SPECTRAL_EPSILON, w + c * 0.01435687 + m * 0.50255080 + y * 0.98351247 + r * 0.98551323 + g * 0.49625685 + b * 0.01571059);
    R[36] = max(SPECTRAL_EPSILON, w + c * 0.01435370 + m * 0.50126452 + y * 0.98350101 + r * 0.98551563 + g * 0.49807754 + b * 0.01569728);
    R[37] = max(SPECTRAL_EPSILON, w + c * 0.01435408 + m * 0.50083021 + y * 0.98350852 + r * 0.98551547 + g * 0.49889859 + b * 0.01570020);
}

vec3 spectral_xyz_to_srgb(vec3 xyz) {
    mat3 XYZ_RGB;

    XYZ_RGB[0] = vec3( 3.24306333, -1.53837619, -0.49893282);
    XYZ_RGB[1] = vec3(-0.96896309,  1.87542451,  0.04154303);
    XYZ_RGB[2] = vec3( 0.05568392, -0.20417438,  1.05799454);
    
    float r = dot(XYZ_RGB[0], xyz);
    float g = dot(XYZ_RGB[1], xyz);
    float b = dot(XYZ_RGB[2], xyz);

    return spectral_linear_to_srgb(vec3(r, g, b));
}

vec3 spectral_reflectance_to_xyz(float R[SPECTRAL_SIZE]) {
    vec3 xyz = vec3(0.0);
    
    xyz +=  R[0] * vec3(0.00006469, 0.00000184, 0.00030502);
    xyz +=  R[1] * vec3(0.00021941, 0.00000621, 0.00103681);
    xyz +=  R[2] * vec3(0.00112057, 0.00003101, 0.00531314);
    xyz +=  R[3] * vec3(0.00376661, 0.00010475, 0.01795439);
    xyz +=  R[4] * vec3(0.01188055, 0.00035364, 0.05707758);
    xyz +=  R[5] * vec3(0.02328644, 0.00095147, 0.11365162);
    xyz +=  R[6] * vec3(0.03455942, 0.00228226, 0.17335873);
    xyz +=  R[7] * vec3(0.03722379, 0.00420733, 0.19620658);
    xyz +=  R[8] * vec3(0.03241838, 0.00668880, 0.18608237);
    xyz +=  R[9] * vec3(0.02123321, 0.00988840, 0.13995048);
    xyz += R[10] * vec3(0.01049099, 0.01524945, 0.08917453);
    xyz += R[11] * vec3(0.00329584, 0.02141831, 0.04789621);
    xyz += R[12] * vec3(0.00050704, 0.03342293, 0.02814563);
    xyz += R[13] * vec3(0.00094867, 0.05131001, 0.01613766);
    xyz += R[14] * vec3(0.00627372, 0.07040208, 0.00775910);
    xyz += R[15] * vec3(0.01686462, 0.08783871, 0.00429615);
    xyz += R[16] * vec3(0.02868965, 0.09424905, 0.00200551);
    xyz += R[17] * vec3(0.04267481, 0.09795667, 0.00086147);
    xyz += R[18] * vec3(0.05625475, 0.09415219, 0.00036904);
    xyz += R[19] * vec3(0.06947040, 0.08678102, 0.00019143);
    xyz += R[20] * vec3(0.08305315, 0.07885653, 0.00014956);
    xyz += R[21] * vec3(0.08612610, 0.06352670, 0.00009231);
    xyz += R[22] * vec3(0.09046614, 0.05374142, 0.00006813);
    xyz += R[23] * vec3(0.08500387, 0.04264606, 0.00002883);
    xyz += R[24] * vec3(0.07090667, 0.03161735, 0.00001577);
    xyz += R[25] * vec3(0.05062889, 0.02088521, 0.00000394);
    xyz += R[26] * vec3(0.03547396, 0.01386011, 0.00000158);
    xyz += R[27] * vec3(0.02146821, 0.00810264, 0.00000000);
    xyz += R[28] * vec3(0.01251646, 0.00463010, 0.00000000);
    xyz += R[29] * vec3(0.00680458, 0.00249138, 0.00000000);
    xyz += R[30] * vec3(0.00346457, 0.00125930, 0.00000000);
    xyz += R[31] * vec3(0.00149761, 0.00054165, 0.00000000);
    xyz += R[32] * vec3(0.00076970, 0.00027795, 0.00000000);
    xyz += R[33] * vec3(0.00040737, 0.00014711, 0.00000000);
    xyz += R[34] * vec3(0.00016901, 0.00006103, 0.00000000);
    xyz += R[35] * vec3(0.00009522, 0.00003439, 0.00000000);
    xyz += R[36] * vec3(0.00004903, 0.00001771, 0.00000000);
    xyz += R[37] * vec3(0.00002000, 0.00000722, 0.00000000);

    return xyz;
}

float spectral_linear_to_concentration(float l1, float l2, float t) {
    float t1 = l1 * pow(1.0 - t, 2.0);
    float t2 = l2 * pow(t, 2.0);

    return t2 / (t1 + t2);
}

vec3 spectral_mix(vec3 color1, vec3 color2, float t) {
    vec3 lrgb1 = spectral_srgb_to_linear(color1);
    vec3 lrgb2 = spectral_srgb_to_linear(color2);

    float R1[SPECTRAL_SIZE];
    float R2[SPECTRAL_SIZE];

    spectral_linear_to_reflectance(lrgb1, R1);
    spectral_linear_to_reflectance(lrgb2, R2);

    float l1 = spectral_reflectance_to_xyz(R1)[1];
    float l2 = spectral_reflectance_to_xyz(R2)[1];

    t = spectral_linear_to_concentration(l1, l2, t);

    float R[SPECTRAL_SIZE];

    for (int i = 0; i < SPECTRAL_SIZE; i++) {
      float KS = (1.0 - t) * (pow(1.0 - R1[i], 2.0) / (2.0 * R1[i])) + t * (pow(1.0 - R2[i], 2.0) / (2.0 * R2[i]));
      float KM = 1.0 + KS - sqrt(pow(KS, 2.0) + 2.0 * KS);

      //Saunderson correction
      // let S = ((1.0 - K1) * (1.0 - K2) * KM) / (1.0 - K2 * KM);

      R[i] = KM;
    }

    return spectral_xyz_to_srgb(spectral_reflectance_to_xyz(R));
}

vec4 spectral_mix(vec4 color1, vec4 color2, float t) {
    return vec4(spectral_mix(color1.rgb, color2.rgb, t), mix(color1.a, color2.a, t));
}

#endif
    `;
  }

  exports.RGB = RGB;
  exports.RGBA = RGBA;
  exports.HEX = HEX;
  exports.HEXA = HEXA;

  exports.mix = mix;
  exports.palette = palette;
  exports.glsl_color = glsl_color;
  exports.glsl = glsl;
});
