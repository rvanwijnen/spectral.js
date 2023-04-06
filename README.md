
![logo](/images/logo.png)
# Spectral.js
[![Twitter URL](https://img.shields.io/twitter/url/https/twitter.com/onedayofcrypto.svg?style=social&label=Follow%20%40onedayofcrypto)](https://twitter.com/bukotsunikki)

Spectral.js is a powerful and versatile JavaScript library that allows you to achieve realistic color mixing in your web-based projects. It is based on the Kubelka-Munk theory, a proven scientific model that simulates how light interacts with paint to produce lifelike color mixing.

Spectral.js can be used in a wide range of web-based projects, including:

- Web design: Use Spectral.js to create lifelike color palettes for your web designs.
- Graphics: Enhance your graphics with realistic color mixing.
- Generative art: Create stunning generative art using Spectral.js' powerful color mixing capabilities.

[Demo](https://onedayofcrypto.art/)

If you use this library please let me know! I would love to see what you do with it.

## Features
- Realistic color mixing based on the Kubelka-Munk theory.
- Easy to use and implement in your projects.
- Ideal for graphic designers, web developers, and generative artists.

## Getting Started
Getting started with Spectral.js is easy. Simply include the library in your project, and you're ready to go.

## Installation
Install via npm:

	npm install spectral.js
Include the following script in your HTML:

	<script src="spectral.js"></script>

## Usage

### Mix
The spectral.mix function takes 3 parameters: color1, color2, and mix factor, with an optional 4th parameter for the return format. It mixes the two colors based on the factor, and calculates the new color.
The return format can be spectral.RGB, spectral.RGBA, spectral.HEXA, or spectral.HEX (default).

	let color = spectral.mix('#00357B', '#D79900', 0.5);
	let color = spectral.mix('rgb(0, 33, 133)', 'rgb(215, 153, 0)', 0.5);
	let color = spectral.mix('[0, 33, 133]', '[215, 153, 0]', 0.5, spectral.RGB);

![image1](/images/image1.png)

### Palette
The spectral.palette function takes 3 required parameters: color1, color2, and length, and an optional fourth parameter for the return format. It returns an array of colors that gradually transition from color1 to color2 with the specified length.

	let palette = spectral.palette('#00357B', '#F0F0F0', 9);
	let palette = spectral.palette('rgb(240, 240, 240)', 'rgb(240, 240, 240)', 9);
	let palette = spectral.palette('[240, 240, 240]', '[240, 240, 240]', 9, spectral.RGB);

![image2](/images/image2.png)

### Shaders
Spectral.js supports WebGL and WebGL2 shaders and has a built-in function 'spectral.webgl_color()' to conveniently convert color notation to an array for the shader. 
##### WebGL
	let vertShader = createShader(gl, gl.VERTEX_SHADER, spectral.webgl_vertex());
	let fragShader = createShader(gl, gl.FRAGMENT_SHADER, spectral.webgl_fragment());
	
	gl.uniform3fv(gl.getUniformLocation(program, 'u_color1'), spectral.webgl_color('DCEB0f'));
	gl.uniform3fv(gl.getUniformLocation(program, 'u_color2'), spectral.webgl_color('D33C3C'));
	

##### WebGL2
	let vertShader = createShader(gl, gl.VERTEX_SHADER, spectral.webgl2_vertex());
	let fragShader = createShader(gl, gl.FRAGMENT_SHADER, spectral.webgl2_fragment());
	
	gl.uniform3fv(gl.getUniformLocation(program, 'u_color1'), spectral.webgl_color('rgb(220, 235, 15)'));
	gl.uniform3fv(gl.getUniformLocation(program, 'u_color2'), spectral.webgl_color('rgb(211, 60, 60)'));

![image3](/images/image3.png)

## Contributing
We welcome contributions from the community. If you find a bug or have a feature request, please open an issue on Github.

## Donations
Hi everyone,

I'm thrilled to announce the launch of my new JavaScript library! It's taken months of hard work to create, but I'm happy to offer it to you for free. If you find it helpful, please consider supporting my work with a donation in ETH to OneDayOfCrypto.eth or in Tezos to OneDayOfCrypto.tez.

Your donation will help me continue to maintain and improve the library. If you're unable to contribute financially, you can still help by sharing the library with others or leaving a positive review.

Thank you for your support!

Ronald

## License
Spectral.js is released under the MIT License. See the LICENSE file for details.

## Acknowledgments
- Spectral.js is based on the Kubelka-Munk theory, which was developed by the chemists Richard S. Kubelka and Franz Munk in the 1930s.
- [@geometrian](https://twitter.com/geometrian) for giving permission to use the spectral data from the [Simple Spectral](https://github.com/geometrian/simple-spectral) pathtracer.
- And finally [SCRT WPNS](https://scrtwpns.com/) for their awesome product [Mixbox](https://scrtwpns.com/mixbox/) which inspired me to research the Kubelka-Munk theory, if you're looking for REAL pigment mixing take a look at [Mixbox](https://scrtwpns.com/mixbox/).
