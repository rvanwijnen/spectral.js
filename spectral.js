//  MIT License
//
//  Copyright (c) 2025 Ronald van Wijnen
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

  const SIZE = 38;
  const GAMMA = 2.4;

  /**
   * Class representing a color and its conversions between various color spaces.
   *
   * @class
   */
  class Color {
    /**
     * Create a Color instance.
     *
     * The constructor accepts either:
     * - A single string value (interpreted as a CSS color: hex or rgb).
     * - A single array:
     *   - If its length equals SIZE, it is assumed to be the R values.
     *   - Otherwise, it is assumed to be an sRGB array.
     *
     * @constructor
     * @param {...(string|number[])} args - A single color string or an array of numbers.
     */
    constructor(...args) {
      if (args.length === 1) {
        if (typeof args[0] === 'string') {
          this.sRGB = parse(args[0]).slice(0, 3);
          this.lRGB = sRGB_to_lRGB(this.sRGB);
          this.R = lRGB_to_R(this.lRGB);
          this.XYZ = R_to_XYZ(this.R);
        }

        if (Array.isArray(args[0])) {
          if (args[0].length === SIZE) {
            this.R = args[0];
            this.XYZ = R_to_XYZ(this.R);
            this.lRGB = XYZ_to_lRGB(this.XYZ);
            this.sRGB = lRGB_to_sRGB(this.lRGB);
          } else {
            this.sRGB = args[0];
            this.lRGB = sRGB_to_lRGB(this.sRGB);
            this.R = lRGB_to_R(this.lRGB);
            this.XYZ = R_to_XYZ(this.R);
          }
        }
      }
    }

    /**
     * Gets the OKLab color space representation.
     *
     * @type {number[]}
     * @readonly
     */
    get OKLab() {
      return (this._OKLab ??= XYZ_to_OKLab(this.XYZ));
    }

    /**
     * Gets the OKLCh color space representation.
     *
     * @type {number[]}
     * @readonly
     */
    get OKLCh() {
      return (this._OKLCh ??= OKLab_to_OKLCh(this.OKLab));
    }

    /**
     * Gets the array of KS values computed from R.
     *
     * @type {number[]}
     * @readonly
     */
    get KS() {
      return (this._KS ??= this.R.map((r) => KS(r)));
    }

    /**
     * Gets the luminance value.
     *
     * The value is at least Number.EPSILON.
     *
     * @type {number}
     * @readonly
     */
    get luminance() {
      return (this._luminance ??= Math.max(Number.EPSILON, this.XYZ[1]));
    }

    /**
     * Gets the tinting strength.
     *
     * Default value is 1.
     *
     * @type {number}
     */
    get tintingStrength() {
      return (this._tintingStrength ??= 1);
    }

    /**
     * Sets the tinting strength.
     *
     * @param {number} ts - The new tinting strength.
     */
    set tintingStrength(ts) {
      this._tintingStrength = ts;
    }

    /**
     * Determines whether the color is in gamut based on its linear RGB values.
     *
     * @param {Object} [options={}] - Options for gamut checking.
     * @param {number} [options.epsilon=0] - The tolerance for checking.
     * @return {boolean} True if in gamut; otherwise, false.
     */
    inGamut = ({ epsilon = 0 } = {}) => {
      return inGamut(this.lRGB, epsilon);
    };

    /**
     * Maps the color to a valid gamut using a specified method.
     *
     * @param {Object} [options={}] - Options for gamut mapping.
     * @param {string} [options.method='map'] - Method to use ('clip' or 'map').
     * @return {Color} A new Color instance that is in gamut.
     * @throws {TypeError} If the specified method is unknown.
     */
    toGamut = ({ method = 'map' } = {}) => {
      switch (method.toLowerCase()) {
        case 'clip':
          return new Color(this.sRGB.map((x) => utils.clamp(x, 0, 255)));

        case 'map':
          return gamutMap(this);

        default:
          throw new TypeError(`Unknown method: '${method}'`);
      }
    };

    /**
     * Converts the color to a string representation.
     *
     * The color is first mapped into the gamut before converting.
     *
     * @param {Object} [options={}] - Options for conversion.
     * @param {string} [options.format='hex'] - Output format. Currently supports 'hex'.
     * @param {string} [options.method='map'] - Gamut mapping method ('clip' or 'map').
     * @return {string} The color as a string.
     * @throws {TypeError} If the specified method is unknown.
     * @throws {TypeError} If the specified format is unknown.
     */
    toString = ({ format = 'hex', method = 'map' } = {}) => {
      let sRGB;

      if (!this.inGamut()) {
        switch (method.toLowerCase()) {
          case 'clip':
            sRGB = this.sRGB.map((x) => utils.clamp(x, 0, 255));
            break;

          case 'map':
            sRGB = gamutMap(this).sRGB;
            break;

          default:
            throw new TypeError(`Unknown method: '${method}'`);
        }
      } else {
        sRGB = this.sRGB;
      }

      switch (format.toLowerCase()) {
        case 'hex':
          return `#${sRGB
            .map((x) => x.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase()}`;

        case 'rgb':
          return `rgb(${sRGB.join(', ')})`;

        default:
          throw new TypeError(`Unknown format: '${format}'`);
      }
    };
  }

  /**
   * Checks if all values in the provided linear RGB array are within gamut.
   *
   * @param {number[]} lRGB - Array of linear RGB values.
   * @param {Object} [options={}] - Options for the check.
   * @param {number} [options.epsilon=0] - Tolerance value.
   * @return {boolean} True if all values are within the range [-epsilon, 1+epsilon].
   */
  const inGamut = (lRGB, { epsilon = 0 } = {}) => {
    return lRGB.every((x) => x >= -epsilon && x <= 1 + epsilon);
  };

  /**
   * Computes the Delta E (Euclidean distance) between two OKLab colors.
   *
   * @param {number[]} OKLab1 - First OKLab color representation.
   * @param {number[]} OKLab2 - Second OKLab color representation.
   * @return {number} The distance between the two colors.
   */
  const deltaEOK = (OKLab1, OKLab2) => {
    let [L1, a1, b1] = OKLab1;
    let [L2, a2, b2] = OKLab2;

    return ((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2) ** 0.5;
  };

  /**
   * Maps a color into a valid gamut using a binary search over chroma values.
   *
   * @param {Color} color - The Color instance to be gamut-mapped.
   * @param {Object} [options={}] - Options for gamut mapping.
   * @param {number} [options.jnd=0.03] - Just-noticeable difference threshold.
   * @param {number} [options.e=0.0001] - Epsilon for binary search termination.
   * @return {Color} A new Color instance within gamut.
   */
  const gamutMap = (color, { jnd = 0.03, e = 0.0001 } = {}) => {
    let L = color.OKLCh[0];

    if (L >= 1) {
      return new Color([255, 255, 255]);
    }

    if (L <= 0) {
      return new Color([0, 0, 0]);
    }

    if (inGamut(color.lRGB)) return color;

    let h = color.OKLCh[2];

    let min = 0;
    let max = color.OKLCh[1];
    let min_inGamut = true;

    let current = color.lRGB;
    let clipped = lRGB_to_OKLab(current.map((x) => utils.clamp(x)));

    let E = deltaEOK(clipped, lRGB_to_OKLab(current));
    if (E < jnd) {
      return new Color(lRGB_to_sRGB(XYZ_to_lRGB(OKLab_to_XYZ(clipped))));
    }

    while (max - min > e) {
      const chroma = (min + max) / 2;

      let OKLab = OKLCh_to_OKLab([L, chroma, h]);
      let XYZ = OKLab_to_XYZ(OKLab);

      current = XYZ_to_lRGB(XYZ);

      if (min_inGamut && inGamut(current)) {
        min = chroma;
      } else {
        clipped = lRGB_to_OKLab(current.map((x) => utils.clamp(x)));
        E = deltaEOK(clipped, OKLab);

        if (E < jnd) {
          if (jnd - E < e) {
            break;
          } else {
            min_inGamut = false;
            min = chroma;
          }
        } else {
          max = chroma;
        }
      }
    }

    return new Color(lRGB_to_sRGB(XYZ_to_lRGB(OKLab_to_XYZ(clipped))));
  };

  /**
   * Computes the Kubelka–Munk absorption/scattering parameter KS for a given spectral reflectance R.
   *
   * In Kubelka–Munk theory, the KS function reflects the ratio that controls the conversion from spectral
   * reflectance to an equivalent absorption/scattering coefficient. The formulation
   * <code>(1 - R)² / (2 * R)</code> is a common approximation that assumes a diffusely scattering medium.
   *
   * @param {number} R - The spectral reflectance value.
   * @return {number} The computed KS value.
   */
  const KS = (R) => {
    return (1 - R) ** 2 / (2 * R);
  };

  /**
   * Computes the Kubelka–Munk mixing coefficient KM from a given KS value.
   *
   * The KM function transforms the KS parameter into a measure that can be linearly mixed.
   * This conversion is essential because the Kubelka–Munk model assumes that when pigments are
   * mixed, the resulting reflectance is a function of the weighted combination of the pigment
   * absorption and scattering properties. The formula used here:
   *
   * <pre>
   * KM(KS) = 1 + KS - √(KS² + 2KS)
   * </pre>
   *
   * provides the appropriate transformation for blending multiple pigment spectra.
   *
   * @param {number} KS - The KS value (absorption/scattering parameter).
   * @return {number} The computed KM mixing coefficient.
   */
  const KM = (KS) => {
    return 1 + KS - (KS ** 2 + 2 * KS) ** 0.5;
  };

  /**
   * Mixes multiple colors using a model based on the Kubelka–Munk theory.
   *
   * This function implements a mixing algorithm that is inspired by the Kubelka–Munk theory,
   * which models how light interacts with diffusely scattering and absorbing layers (such as pigments or paints).
   * The approach is as follows:
   *
   * - For each wavelength band (with SIZE samples), compute a weighted average of the KS values.
   * - Weights are determined by the square of a factor that considers both the square-root of the color's
   *   luminance and its tinting strength multiplied by a user-specified factor.
   * - The resulting weighted KS average is then converted back using the KM function to obtain the
   *   mixed spectral reflectance.
   *
   * In effect, this method blends pigments based on their optical absorption and scattering properties,
   * providing a physically motivated approximation for pigment mixing as described by Kubelka–Munk.
   *
   * Each argument should be provided as an array of two elements: [Color, factor]. The factor determines
   * the influence of that particular color in the overall mix.
   *
   * @param {...[Color, number]} colors - Colors and their associated mixing factors.
   * @return {Color} The resulting mixed Color.
   *
   * @example
   * // Mix two Color instances, with a heavier weight given to the first color:
   * const mixedColor = mix([color1, 2], [color2, 1]);
   */
  const mix = (...colors) => {
    let R = new Array(SIZE);

    for (let i = 0; i < SIZE; i++) {
      let ksMix = 0,
        totalConcentration = 0;

      for (let [color, factor] of colors) {
        let concentration = factor ** 2 * color.tintingStrength ** 2 * color.luminance;

        totalConcentration += concentration;

        ksMix += color.KS[i] * concentration;
      }

      R[i] = KM(ksMix / totalConcentration);
    }

    return new Color(R);
  };

  /**
   * Generates a palette of colors transitioning between two colors.
   *
   * @param {Color} a - The starting Color.
   * @param {Color} b - The ending Color.
   * @param {number} size - The number of colors in the palette.
   * @return {Color[]} An array of Color objects forming the palette.
   */
  const palette = (a, b, size) => {
    let p = new Array(size);

    for (let i = 0; i < size; i++) {
      p[i] = mix([a, size - 1 - i], [b, i]);
    }

    return p;
  };

  /**
   * Interpolates between multiple colors based on a parameter t.
   *
   * Each additional argument should be an array with two elements: [Color, position].
   *
   * @param {number} t - Interpolation parameter between 0 and 1.
   * @param {...[Color, number]} colors - Colors with their positions in the gradient.
   * @return {Color} The interpolated Color.
   */
  const gradient = (t, ...colors) => {
    let a = null,
      b = null;

    for (const [color, pos] of colors) {
      if (pos <= t && (!a || pos > a[1])) a = [color, pos];
      if (pos >= t && (!b || pos < b[1])) b = [color, pos];
    }

    if (!a) return b[0];
    if (!b) return a[0];

    if (a[1] === b[1]) return a[0];

    const factor = (t - a[1]) / (b[1] - a[1]);

    return mix([a[0], 1 - factor], [b[0], factor]);
  };

  /**
   * Applies the inverse companding (linearization) to a value.
   *
   * @param {number} x - The sRGB value in the range [0, 1].
   * @return {number} The uncompanded (linear) value.
   */
  const uncompand = (x) => {
    return x > 0.04045 ? ((x + 0.055) / 1.055) ** GAMMA : x / 12.92;
  };

  /**
   * Applies the companding function to a value.
   *
   * @param {number} x - The linear value.
   * @return {number} The companded sRGB value in the range [0, 1].
   */
  const compand = (x) => {
    return x > 0.0031308 ? 1.055 * x ** (1.0 / GAMMA) - 0.055 : x * 12.92;
  };

  /**
   * Converts sRGB values (in [0,255]) to linear RGB values.
   *
   * @param {number[]} sRGB - Array of sRGB component values.
   * @return {number[]} The corresponding linear RGB values.
   */
  const sRGB_to_lRGB = (sRGB) => {
    return sRGB.map((x) => uncompand(x / 255));
  };

  /**
   * Converts linear RGB values to sRGB values (in [0,255]).
   *
   * @param {number[]} lRGB - Array of linear RGB values.
   * @return {number[]} The corresponding sRGB values rounded to the nearest integer.
   */
  const lRGB_to_sRGB = (lRGB) => {
    return lRGB.map((x) => Math.round(compand(x) * 255));
  };

  /**
   * Converts XYZ color space values to linear RGB.
   *
   * @param {number[]} XYZ - XYZ representation.
   * @return {number[]} The corresponding linear RGB values.
   */
  const XYZ_to_lRGB = (XYZ) => {
    return utils.mulMatVec(CONVERSION.XYZ_RGB, XYZ);
  };

  /**
   * Converts linear RGB values to XYZ color space.
   *
   * @param {number[]} lRGB - Linear RGB values.
   * @return {number[]} The corresponding XYZ values.
   */
  const lRGB_to_XYZ = (lRGB) => {
    return utils.mulMatVec(CONVERSION.RGB_XYZ, lRGB);
  };

  /**
   * Converts linear RGB values directly to OKLab by first converting to XYZ.
   *
   * @param {number[]} lRGB - Linear RGB values.
   * @return {number[]} The corresponding OKLab values.
   */
  const lRGB_to_OKLab = (lRGB) => {
    return XYZ_to_OKLab(lRGB_to_XYZ(lRGB));
  };

  /**
   * Converts XYZ values to OKLab color space.
   *
   * @param {number[]} XYZ - XYZ representation.
   * @return {number[]} The resulting OKLab values.
   */
  const XYZ_to_OKLab = (XYZ) => {
    let lms = utils.mulMatVec(CONVERSION.XYZ_LMS, XYZ).map((x) => Math.cbrt(x));

    return utils.mulMatVec(CONVERSION.LMS_LAB, lms);
  };

  /**
   * Converts OKLab values to XYZ color space.
   *
   * @param {number[]} OKLab - OKLab representation.
   * @return {number[]} The resulting XYZ values.
   */
  const OKLab_to_XYZ = (OKLab) => {
    let lms = utils.mulMatVec(CONVERSION.LAB_LMS, OKLab).map((x) => x ** 3);

    return utils.mulMatVec(CONVERSION.LMS_XYZ, lms);
  };

  /**
   * Converts OKLab values to OKLCh color space.
   *
   * @param {number[]} OKLab - OKLab representation.
   * @return {number[]} An array [L, C, H] representing the OKLCh color.
   */
  const OKLab_to_OKLCh = (OKLab) => {
    let [L, a, b] = OKLab;

    const C = (a * a + b * b) ** 0.5;
    const h = (Math.atan2(b, a) * 180) / Math.PI;

    return [L, C, h >= 0 ? h : h + 360];
  };

  /**
   * Converts OKLCh values to OKLab color space.
   *
   * @param {number[]} OKLCh - An array [L, C, H] representing the OKLCh color.
   * @return {number[]} The resulting OKLab values.
   */
  const OKLCh_to_OKLab = (OKLCh) => {
    let [L, C, h] = OKLCh;

    let a = C * Math.cos((h * Math.PI) / 180);
    let b = C * Math.sin((h * Math.PI) / 180);

    return [L, a, b];
  };

  /**
   * Converts spectral reflectance values to XYZ using the CIE color matching functions.
   *
   * @param {number[]} R - Array of spectral reflectance values.
   * @return {number[]} The resulting XYZ values.
   */
  const R_to_XYZ = (R) => {
    return utils.mulMatVec(CIE.CMF, R);
  };

  /**
   * Converts linear RGB values to spectral reflectance values.
   *
   * This function uses pre-calculated reflectances.
   *
   * @param {number[]} lRGB - Linear RGB values.
   * @return {number[]} The resulting spectral reflectance values.
   */
  const lRGB_to_R = (lRGB) => {
    let w = Math.min(...lRGB);

    lRGB = [lRGB[0] - w, lRGB[1] - w, lRGB[2] - w];

    let c = Math.min(lRGB[1], lRGB[2]);
    let m = Math.min(lRGB[0], lRGB[2]);
    let y = Math.min(lRGB[0], lRGB[1]);
    let r = Math.max(0, Math.min(lRGB[0] - lRGB[2], lRGB[0] - lRGB[1]));
    let g = Math.max(0, Math.min(lRGB[1] - lRGB[2], lRGB[1] - lRGB[0]));
    let b = Math.max(0, Math.min(lRGB[2] - lRGB[1], lRGB[2] - lRGB[0]));

    const R = new Array(SIZE);

    for (let i = 0; i < SIZE; i++) {
      R[i] = Math.max(
        Number.EPSILON,
        w * BASE_SPECTRA.W[i] + c * BASE_SPECTRA.C[i] + m * BASE_SPECTRA.M[i] + y * BASE_SPECTRA.Y[i] + r * BASE_SPECTRA.R[i] + g * BASE_SPECTRA.G[i] + b * BASE_SPECTRA.B[i]
      );
    }

    return R;
  };

  /**
   * A collection of utility functions for mathematical operations.
   *
   * @namespace
   */
  const utils = {
    /**
     * Linear interpolation between two values.
     *
     * @param {number} a - Start value.
     * @param {number} b - End value.
     * @param {number} t - Interpolation factor in [0,1].
     * @return {number} The interpolated value.
     */
    lerp: (a, b, t) => a + (b - a) * t,

    /**
     * Clamps a value between a minimum and maximum.
     *
     * @param {number} x - The value to clamp.
     * @param {number} [min=0] - Minimum allowed value.
     * @param {number} [max=1] - Maximum allowed value.
     * @return {number} The clamped value.
     */
    clamp: (x, min = 0, max = 1) => Math.min(Math.max(x, min), max),

    /**
     * Calculates the dot product between two arrays of numbers.
     *
     * @param {number[]} a - First vector.
     * @param {number[]} b - Second vector.
     * @return {number} The dot product.
     */
    dot: (a, b) => a.reduce((acc, val, i) => acc + val * b[i], 0),

    /**
     * Multiplies a matrix with a vector.
     *
     * @param {number[][]} m - The matrix.
     * @param {number[]} v - The vector.
     * @return {number[]} The resulting vector.
     */
    mulMatVec: (m, v) => m.map((row) => utils.dot(row, v)),
  };

  /**
   * Parses a CSS color string (hex or rgb) and returns an array of components.
   *
   * For hex strings, returns an array in the format: [R, G, B, A] (with A defaulting to 1 if omitted).
   * For rgb strings, converts percentages to values in [0, 255] if necessary.
   *
   * @param {string} str - The CSS color string to parse.
   * @return {(number[]|number)} An array of color components or NaN if unrecognized.
   */
  const parse = (str) => {
    if (str[0] === '#') {
      str = str.slice(1);
      if (str.length === 3) {
        str = str.replace(/./g, (m) => m + m)
      }

      return [
        parseInt(str.substring(0, 2), 16),
        parseInt(str.substring(2, 4), 16),
        parseInt(str.substring(4, 6), 16),
        str.length === 8 ? parseInt(str.substring(6, 8), 16) / 255 : 1,
      ];
    } else if (str.startsWith('rgb')) {
      return str
        .slice(str.indexOf('(') + 1, -1)
        .split(',')
        .map((v, i) => (i < 3 && v.includes('%') ? Math.round(parseFloat(v) * 2.55) : parseFloat(v)));
    }

    return NaN;
  };

  /**
   * Spectra data.
   *
   * Contains arrays for various spectra (White, Cyan, Magenta, Yellow, Red, Green, Blue).
   *
   * @constant {object}
   * @readonly
   */
  const BASE_SPECTRA = Object.freeze({
    W: [
      1.00116072718764, 1.00116065159728, 1.00116031922747, 1.00115867270789, 1.00115259844552, 1.00113252528998, 1.00108500663327, 1.00099687889453, 1.00086525152274,
      1.0006962900094, 1.00050496114888, 1.00030808187992, 1.00011966602013, 0.999952765968407, 0.999821836899297, 0.999738609557593, 0.999709551639612, 0.999731930210627,
      0.999799436346195, 0.999900330316671, 1.00002040652611, 1.00014478793658, 1.00025997903412, 1.00035579697089, 1.00042753780269, 1.00047623344888, 1.00050720967508,
      1.00052519156373, 1.00053509606896, 1.00054022097482, 1.00054272816784, 1.00054389569087, 1.00054448212151, 1.00054476959992, 1.00054489887762, 1.00054496254689,
      1.00054498927058, 1.000544996993,
    ],
    C: [
      0.970585001322962, 0.970592498143425, 0.970625348729891, 0.970786806119017, 0.971368673228248, 0.973163230621252, 0.976740223158765, 0.981587605491377, 0.986280265652949,
      0.989949147689134, 0.99249270153842, 0.994145680405256, 0.995183975033212, 0.995756750110818, 0.99591281828671, 0.995606157834528, 0.994597600961854, 0.99221571549237,
      0.986236452783249, 0.967943337264541, 0.891285004244943, 0.536202477862053, 0.154108119001878, 0.0574575093228929, 0.0315349873107007, 0.0222633920086335, 0.0182022841492439,
      0.016299055973264, 0.0153656239334613, 0.0149111568733976, 0.0146954339898235, 0.0145964146717719, 0.0145470156699655, 0.0145228771899495, 0.0145120341118965,
      0.0145066940939832, 0.0145044507314479, 0.0145038009464639,
    ],
    M: [
      0.990673557319988, 0.990671524961979, 0.990662582353421, 0.990618107644795, 0.99045148087871, 0.989871081400204, 0.98828660875964, 0.984290692797504, 0.973934905625306,
      0.941817838460145, 0.817390326195156, 0.432472805065729, 0.13845397825887, 0.0537347216940033, 0.0292174996673231, 0.021313651750859, 0.0201349530181136, 0.0241323096280662,
      0.0372236145223627, 0.0760506552706601, 0.205375471942399, 0.541268903460439, 0.815841685086486, 0.912817704123976, 0.946339830166962, 0.959927696331991, 0.966260595230312,
      0.969325970058424, 0.970854536721399, 0.971605066528128, 0.971962769757392, 0.972127272274509, 0.972209417745812, 0.972249577678424, 0.972267621998742, 0.97227650946215,
      0.972280243306874, 0.97228132482656,
    ],
    Y: [
      0.0210523371789306, 0.0210564627517414, 0.0210746178695038, 0.0211649058448753, 0.0215027957272504, 0.0226738799041561, 0.0258235649693629, 0.0334879385639851,
      0.0519069663740307, 0.100749014833473, 0.239129899706847, 0.534804312272748, 0.79780757864303, 0.911449894067384, 0.953797963004507, 0.971241615465429, 0.979303123807588,
      0.983380119507575, 0.985461246567755, 0.986435046976605, 0.986738250670141, 0.986617882445032, 0.986277776758643, 0.985860592444056, 0.98547492767621, 0.985176934765558,
      0.984971574014181, 0.984846303415712, 0.984775351811199, 0.984738066625265, 0.984719648311765, 0.984711023391939, 0.984706683300676, 0.984704554393091, 0.98470359630937,
      0.984703124077552, 0.98470292561509, 0.984702868122795,
    ],
    R: [
      0.0315605737777207, 0.0315520718330149, 0.0315148215513658, 0.0313318044982702, 0.0306729857725527, 0.0286480476989607, 0.0246450407045709, 0.0192960753663651,
      0.0142066612220556, 0.0102942608878609, 0.0076191460521811, 0.005898041083542, 0.0048233247781713, 0.0042298748350633, 0.0040599171299341, 0.0043533695594676,
      0.0053434425970201, 0.0076917201010463, 0.0135969795736536, 0.0316975442661115, 0.107861196355249, 0.463812603168704, 0.847055405272011, 0.943185409393918, 0.968862150696558,
      0.978030667473603, 0.982043643854306, 0.983923623718707, 0.984845484154382, 0.985294275814596, 0.985507295219825, 0.985605071539837, 0.985653849933578, 0.985677685033883,
      0.985688391806122, 0.985693664690031, 0.985695879848205, 0.985696521463762,
    ],
    G: [
      0.0095560747554212, 0.0095581580120851, 0.0095673245444588, 0.0096129126297349, 0.0097837090401843, 0.010378622705871, 0.0120026452378567, 0.0160977721473922,
      0.026706190223168, 0.0595555440185881, 0.186039826532826, 0.570579820116159, 0.861467768400292, 0.945879089767658, 0.970465486474305, 0.97841363028445, 0.979589031411224,
      0.975533536908632, 0.962288755397813, 0.92312157451312, 0.793434018943111, 0.459270135902429, 0.185574103666303, 0.0881774959955372, 0.05436302287667, 0.0406288447060719,
      0.034221520431697, 0.0311185790956966, 0.0295708898336134, 0.0288108739348928, 0.0284486271324597, 0.0282820301724731, 0.0281988376490237, 0.0281581655342037,
      0.0281398910216386, 0.0281308901665811, 0.0281271086805816, 0.0281260133612096,
    ],
    B: [
      0.979404752502014, 0.97940070684313, 0.979382903470261, 0.979294364945594, 0.97896301460857, 0.977814466694043, 0.974724321133836, 0.967198482343973, 0.949079657530575,
      0.900850128940977, 0.76315044546224, 0.465922171649319, 0.201263280451005, 0.0877524413419623, 0.0457176793291679, 0.0284706050521843, 0.020527176756985, 0.0165302792310211,
      0.0145135107212858, 0.0136003508637687, 0.0133604258769571, 0.013548894314568, 0.0139594356366992, 0.014443425575357, 0.0148854440621406, 0.0152254296999746,
      0.0154592848180209, 0.0156018026485961, 0.0156824871281936, 0.0157248764360615, 0.0157458108784121, 0.0157556123350225, 0.0157605443964911, 0.0157629637515278,
      0.0157640525629106, 0.015764589232951, 0.0157648147772649, 0.0157648801149616,
    ],
  });

  /**
   * CIE Color Matching Functions weighted by D65 Standard Illuminant
   *
   * @constant {object}
   * @readonly
   */
  const CIE = Object.freeze({
    CMF: [
      [
        0.0000646919989576, 0.0002194098998132, 0.0011205743509343, 0.0037666134117111, 0.011880553603799, 0.0232864424191771, 0.0345594181969747, 0.0372237901162006,
        0.0324183761091486, 0.021233205609381, 0.0104909907685421, 0.0032958375797931, 0.0005070351633801, 0.0009486742057141, 0.0062737180998318, 0.0168646241897775,
        0.028689649025981, 0.0426748124691731, 0.0562547481311377, 0.0694703972677158, 0.0830531516998291, 0.0861260963002257, 0.0904661376847769, 0.0850038650591277,
        0.0709066691074488, 0.0506288916373645, 0.035473961885264, 0.0214682102597065, 0.0125164567619117, 0.0068045816390165, 0.0034645657946526, 0.0014976097506959,
        0.000769700480928, 0.0004073680581315, 0.0001690104031614, 0.0000952245150365, 0.0000490309872958, 0.0000199961492222,
      ],
      [
        0.000001844289444, 0.0000062053235865, 0.0000310096046799, 0.0001047483849269, 0.0003536405299538, 0.0009514714056444, 0.0022822631748318, 0.004207329043473,
        0.0066887983719014, 0.0098883960193565, 0.0152494514496311, 0.0214183109449723, 0.0334229301575068, 0.0513100134918512, 0.070402083939949, 0.0878387072603517,
        0.0942490536184085, 0.0979566702718931, 0.0941521856862608, 0.0867810237486753, 0.0788565338632013, 0.0635267026203555, 0.05374141675682, 0.042646064357412,
        0.0316173492792708, 0.020885205921391, 0.0138601101360152, 0.0081026402038399, 0.004630102258803, 0.0024913800051319, 0.0012593033677378, 0.000541646522168,
        0.0002779528920067, 0.0001471080673854, 0.0000610327472927, 0.0000343873229523, 0.0000177059860053, 0.000007220974913,
      ],
      [
        0.000305017147638, 0.0010368066663574, 0.0053131363323992, 0.0179543925899536, 0.0570775815345485, 0.113651618936287, 0.17335872618355, 0.196206575558657,
        0.186082370706296, 0.139950475383207, 0.0891745294268649, 0.0478962113517075, 0.0281456253957952, 0.0161376622950514, 0.0077591019215214, 0.0042961483736618,
        0.0020055092122156, 0.0008614711098802, 0.0003690387177652, 0.0001914287288574, 0.0001495555858975, 0.0000923109285104, 0.0000681349182337, 0.0000288263655696,
        0.0000157671820553, 0.0000039406041027, 0.000001584012587, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      ],
    ],
  });

  /**
   * Conversion matrices and constants for various color space transformations.
   *
   * @constant {object}
   * @readonly
   * @see {@link https://github.com/w3c/csswg-drafts/issues/5922}
   * @see {@link https://github.com/color-js/color.js/blob/main/src/spaces/srgb-linear.js}
   * @see {@link https://github.com/color-js/color.js/blob/main/src/spaces/oklab.js}
   */
  const CONVERSION = Object.freeze({
    //sRGB <-> XYZ conversion matrices
    RGB_XYZ: [
      [0.41239079926595934, 0.357584339383878, 0.1804807884018343],
      [0.21263900587151027, 0.715168678767756, 0.07219231536073371],
      [0.01933081871559182, 0.11919477979462598, 0.9505321522496607],
    ],
    XYZ_RGB: [
      [3.2409699419045226, -1.537383177570094, -0.4986107602930034],
      [-0.9692436362808796, 1.8759675015077202, 0.04155505740717559],
      [0.05563007969699366, -0.20397695888897652, 1.0569715142428786],
    ],

    // OKLab conversion matrices
    XYZ_LMS: [
      [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
      [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
      [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
    ],
    LMS_XYZ: [
      [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
      [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
      [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
    ],
    LMS_LAB: [
      [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
      [1.9779985324311684, -2.4285922420485799, 0.450593709617411],
      [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
    ],
    LAB_LMS: [
      [1.0, 0.3963377773761749, 0.2158037573099136],
      [1.0, -0.1055613458156586, -0.0638541728258133],
      [1.0, -0.0894841775298119, -1.2914855480194092],
    ],
  });

  exports.Color = Color;

  exports.mix = mix;
  exports.palette = palette;
  exports.gradient = gradient;
});
