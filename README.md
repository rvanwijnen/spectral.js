![logo](/images/banner.png)

[![](https://data.jsdelivr.com/v1/package/npm/spectral.js/badge?style=rounded)](https://www.jsdelivr.com/package/npm/spectral.js)
[![Twitter URL](https://img.shields.io/twitter/url/https/twitter.com/onedayofcrypto.svg?style=social&label=Follow%20%40ronaldvanwijnen)](https://twitter.com/ronaldvanwijnen)

**Spectral.js** is a lightweight JavaScript library for realistic color mixing based on the **Kubelka-Munk theory**.
It's designed specifically for developers and artists aiming to implement realistic pigment mixing in their projects.

---

## 🧭 Design Philosophy

**Spectral.js** is built on the idea that **realistic color mixing** should be both **accurate** and **accessible**. While most digital color tools rely on linear or additive RGB blending, **Spectral.js** takes a physically-informed approach by simulating how pigments interact with light using the **Kubelka-Munk theory**.

The goals behind Spectral.js:

- 🎨 **Physically-based**: Pigment mixing is modeled using spectral data and light-matter interaction, not RGB math tricks.
- ⚖️ **Perceptually aware**: Uses color spaces like **OKLab** and **OKLCh** for perceptual uniformity and smart gamut mapping.
- 🧠 **Intelligent mixing**: Every mix uses **luminance**, **tinting strength**, and user-defined intent to calculate **effective concentration**.
- 🚀 **Optimized for performance**: Lazy memoization and fast math make it lightweight and fast, even in browser environments.
- 🛠️ **Simple API**: Designed for developers and artists alike — works with familiar hex, RGB, and CSS strings.
- 📐 **Accurate under the hood**: All calculations use **64-bit floating point math** and are grounded in color science literature.

Whether you’re building a color picker, a digital painting app, or just experimenting with creative coding, **Spectral.js** gives you a closer approximation to how real pigments behave.

👉 You can try **Spectral.js** live at [spectraljs.com](https://spectraljs.com/)!

---

## 📖 About Kubelka-Munk Theory

The **Kubelka-Munk theory** is a color science model that predicts how light interacts with pigmented materials by focusing on three main optical properties:

- **Absorption (K)**: How the material absorbs incident light.  
- **Scattering (S)**: How the material scatters light within it.  
- **Reflectance (R)**: The proportion of light diffusely reflected from the surface.

By modeling the interplay between absorption and scattering, the theory predicts the reflectance of pigmented materials across the **visible spectrum (approximately 380 to 750 nm)** — which in turn determines their perceived color.

**Spectral.js** uses the "simplified" or **single-constant Kubelka-Munk theory**, where the **scattering coefficient (S)** is assumed to be constant. This assumption allows the **Kubelka-Munk function \( F(R) \)** to directly relate reflectance to absorption:

```math
F(R) = \frac{(1 - R)^2}{2R} = \frac{K}{S}
```

This relationship enables easy estimation of relative absorption from reflectance data, particularly useful in color matching and pigment formulation.

---

## 🌈 How Spectral.js Works

**Spectral.js** generates a spectral reflectance curve from a given RGB triplet by calculating the weights for combining the seven primary spectral reflectance curves: **White, Cyan, Magenta, Yellow, Red, Green, and Blue**.
The resulting spectral reflectance curve is then used to calculate the Kubelka-Munk \( K/S \) values which are used in the mix function.

What sets **Spectral.js** apart is its spectral mixing model, which simulates how real pigments combine based on light absorption and scattering — rather than relying on RGB math. When colors are mixed, it calculates an **effective concentration** for each pigment using the formula:

```math
C = f^2 \cdot T^2 \cdot L
```

Where:
- \( L \): luminance  
- \( T \): tinting strength — applied exponentially to emphasize its effect on stronger or weaker pigments  
- \( f \): user-defined mixing factor

This formula integrates **luminance** (\(L\)), **tinting strength** (\(T\)), and the user-defined **mixing factor** (\(f\))—capturing how strongly a pigment influences the mix based on both its optical weight and intent. These **concentrations** are used to compute the **weighted sum of each color’s Kubelka-Munk \( K/S \)** value, resulting in a combined **\( K/S_{mix} \)** for the mixture.

Then the **inverse Kubelka-Munk function** is used which takes **\( K/S_{mix} \)** divided by the total concentration and returns the **reflectance \( R \)**:

```math
R = 1 + \left(\frac{K}{S}_{mix}\right) - \sqrt{\left(\frac{K}{S}_{mix}\right)^2 + 2 \cdot \left(\frac{K}{S}_{mix}\right)}
```

Using the **CIE 1931 Color Matching Functions** weighted with the **D65 Standard Illuminant** the **reflectance \( R \)** is then converted to **CIE XYZ**. 

All spectral and colorimetric calculations are performed using **64-bit floating point precision** ensuring stable results.

---

## 📦 Installation

Include **Spectral.js** in your project easily via npm:

	npm install spectral.js

Or download it from the releases.

Include the following script in your HTML:

```html
<script src="spectral.js"></script>
```

---

## 🚀 Usage

### Color

The heart of **Spectral.js** is its **Color** class, every function uses this as input and output.

```js
let color = new spectral.Color('#002185');
let color = new spectral.Color('rgb(0, 33, 133)');
let color = new spectral.Color([0, 33, 133]);
```

### Mix

The **mix** function takes any number of colors with factor and returns a new **Color** object.
Whole numbers can be used for the factor, they will be normalized.

```js
let color1 = new spectral.Color('#002185');
let color2 = new spectral.Color('#FCD200');

let mix = spectral.mix([color1, 0.5], [color2, 0.5]);

console.log(mix.toString()); //#3D933E
```

![image1](/images/image01.png)

```js
let color1 = new spectral.Color('#FCF046');
let color2 = new spectral.Color('#E53166');
let color3 = new spectral.Color('#3375DA');

let mix = spectral.mix([color1, 1], [color2, 1], [color3, 1]);

console.log(mix.toString()); //#8D7964
```

![image1](/images/image02.png)

### Palette

The **palette** function takes 2 colors and a size parameter, it returns an array of **Color** objects that gradually transition from color1 to color2 with the specified size.

```js
let color1 = new spectral.Color('#BB0657');
let color2 = new spectral.Color('#E0E0B3');

let palette = spectral.palette(color1, color2, 8);

console.log(palette.map((x) => x.toString())); //['#BB0657', '#C00C5C', '#CD1E6F', '#DD3889', '#E85AA0', '#ED85AF', '#E9B9B4', '#E0E0B3']
```

![image1](/images/image03.png)

### Gradient

The **gradient** function takes any number of colors with color-stop positions and returns a new **Color** object at a given position.
Positions are between 0 and 1.

```js
let color1 = new spectral.Color('#005E72');
let color2 = new spectral.Color('#EAD9A7');
let color3 = new spectral.Color('#894B54');

let t = 0.75; //get color at position t

let gradient = spectral.gradient(t, [color1, 0], [color2, 0.5], [color3, 1]);

console.log(gradient.toString()); //#C7938C
```

![image1](/images/image04.png)

### Tinting Strength

Sometimes a **Color** is too dominant and this can be countered by adjusting the **tinting strength**.
To my knowledge there is no way to programmatically determine if a **Color** is too dominant as this is pure perceptual.

```js
let color1 = new spectral.Color('#ff0000');
let color2 = new spectral.Color('#ffff00');

let mix = spectral.mix([color1, 0.5], [color2, 0.5]);

console.log(mix.toString()); //#FF440F
```

![image1](/images/image05.png)

```js
let color1 = new spectral.Color('#ff0000');
let color2 = new spectral.Color('#ffff00');

color1.tintingStrength = 0.35;

let mix = spectral.mix([color1, 0.5], [color2, 0.5]);

console.log(mix.toString()); //#FF8427
```

![image1](/images/image06.png)

---

## 🧵 GLSL Integration

The spectral.glsl file brings **Spectral.js** to **GLSL** for use in shaders.
It enables real-time spectral color mixing directly on the GPU, perfect for generative art and WebGL projects.

- Supports mixing between **2 to 4 colors**.
- Includes optional **tinting strength** control per color.
- 👉 A live demo is available on [ShaderToy](https://www.shadertoy.com/view/33XSWl).

### 🔧 Basic Usage

```glsl
vec3 yellow = vec3(0.9734452903984108, 0.871367119198797000, 0.06124605423161808);
vec3 red    = vec3(0.7835377915261926, 0.030713443732993822, 0.13286832155381810);
vec3 blue   = vec3(0.0331047665708844, 0.177888415983629100, 0.70110189193297420);

vec3 col = spectral_mix(
	yellow, 1., 1. - p.x,
	red, 0.5, p.x - p.y,
	blue, 1., p.y
);
```

![image1](/images/image07.png)

---

## 🛠️ API Documentation

### 🔹 Color Class

The **Color** class internally computes **spectral reflectance**, **XYZ**, **OKLab**, **OKLCh**, and **Kubelka-Munk** parameters.
To optimize performance, the class uses **lazy memoization**: values such as **luminance**, **KS**, and transforms to color spaces like **OKLab** and **OKLCh** are computed only once when accessed, then cached for future use, ensuring high performance without redundant calculations.

#### Methods and Properties:
- `color.R` – Reflectance curve from 380 to 750 nm in 10 nm steps.
- `color.sRGB` – sRGB color space representation.
- `color.lRGB` – linear RGB color space representation.
- `color.XYZ` – CIE XYZ color space representation.
- `color.OKLab` – OKLab color space representation.
- `color.OKLCh` – OKLCh color representation.
- `color.KS` – Kubelka-Munk absorption/scattering parameters.
- `color.luminance` – Luminance (Y value from CIE XYZ).
- `color.tintingStrength` – Intensity of the pigment mixture (default: `1`).
- `color.inGamut({ epsilon })` – Checks if the color is within the displayable gamut.
- `color.toGamut({ method })` – Adjusts color to fit within the gamut (`clip` or `map`).
- `color.toString({ format = "hex", method = "map" })` – Returns the color as a hex or RGB string. If the color is out of gamut, it is adjusted using the specified gamut mapping method ("map" or "clip"). "map" is used by default for perceptual accuracy.

The properties **OKLab**, **OKLCh**, and the utility function **deltaEOK** are not only useful for perceptual color comparison — they are also used internally in gamut mapping.
When a color is outside the displayable sRGB gamut, **Spectral.js** uses **OKLCh chroma reduction** combined with ΔE optimization in **OKLab** space to bring the color into gamut while preserving appearance as closely as possible.

---

## 🚨 Upgrading from 2.0.2

Version **3.0** introduces **breaking changes** due to the addition of the **Color** class.

- All functions like `mix`, `palette`, and `gradient` now expect **Color** objects, **not** raw arrays or hex strings.
- Color values must be explicitly created using the `Color` constructor before being passed into mixing functions.

### ⚡ Quick Migration Example

**Before (2.0.2):**

```js
let mix = spectral.mix('#002185', '#FCD200', 0.5);
```

**Now (3.0):**

```js
let color1 = new spectral.Color('#002185');
let color2 = new spectral.Color('#FCD200');

let mix = spectral.mix([color1, 0.5], [color2, 0.5]);
```

👉 **Tip**: Always wrap your hex codes, RGB arrays, or CSS strings with `new spectral.Color()` before mixing!

---

## 🤝 Contributing

Contributions are warmly welcomed! Feel free to open an issue or submit a pull request on GitHub.

---

## ☕ Support

If you find **Spectral.js** helpful, consider buying me a coffee!

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C2KEHZW)

---

## 📜 License

MIT © **2025 Ronald van Wijnen**

---

### 🧠 Acknowledgments
- **Spectral.js** is based on the **Kubelka-Munk theory**, developed by chemists **Richard S. Kubelka** and **Franz Munk** in the **1930s**.
- Thanks to [Scott Allen Burns](http://scottburns.us/) for his research and publication of [Generating Reflectance Curves from sRGB Triplets](http://scottburns.us/reflectance-curves-from-srgb/). The spectral data **Spectral.js** uses is created with a variation of his [LHTSS](http://scottburns.us/reflectance-curves-from-srgb-10/) method.
- **Spectral.js** uses color conversion matrices and structural inspiration from [Color.js](https://colorjs.io/), aiming to maintain compatibility in function naming and color space representation.
- Uses [codedye](https://github.com/Tezumie/codedye) for syntax highlighting on the site.

- Thanks also to [SCRT WPNS](https://scrtwpns.com/) for their awesome product [Mixbox](https://scrtwpns.com/mixbox/) which inspired me to research the Kubelka-Munk theory.



