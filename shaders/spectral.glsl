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

#ifndef SPECTRAL
#define SPECTRAL

const int SPECTRAL_SIZE = 38;
const float SPECTRAL_GAMMA = 2.4;
const float SPECTRAL_EPSILON = 0.01;

float spectral_uncompand(float x) {
  return (x < 0.04045) ? x / 12.92 : pow((x + 0.055) / 1.055, SPECTRAL_GAMMA);
}

float spectral_compand(float x) {
  return (x < 0.0031308) ? x * 12.92 : 1.055 * pow(x, 1.0 / SPECTRAL_GAMMA) - 0.055;
}

vec3 spectral_srgb_to_linear(vec3 srgb) {
    return vec3(spectral_uncompand(srgb[0] + SPECTRAL_EPSILON), spectral_uncompand(srgb[1] + SPECTRAL_EPSILON), spectral_uncompand(srgb[2] + SPECTRAL_EPSILON));
}

vec3 spectral_linear_to_srgb(vec3 lrgb) {
    return clamp(vec3(spectral_compand(lrgb[0] - SPECTRAL_EPSILON), spectral_compand(lrgb[1] - SPECTRAL_EPSILON), spectral_compand(lrgb[2] - SPECTRAL_EPSILON)), 0.0, 1.0);
}

void spectral_weights(vec3 lrgb, inout float weights[7]) {
    weights[0] = 0.;
    weights[1] = 0.;
    weights[2] = 0.;
    weights[3] = 0.;
    weights[4] = 0.;
    weights[5] = 0.;
    weights[6] = 0.;

    if (lrgb[0] <= lrgb[1] && lrgb[0] <= lrgb[2]) {
		weights[0] = lrgb[0];

      	if (lrgb[1] <= lrgb[2]) {
            weights[1] = lrgb[1] - lrgb[0];
            weights[6] = lrgb[2] - lrgb[1];
      	} else {
            weights[1] = lrgb[2] - lrgb[0];
            weights[5] = lrgb[1] - lrgb[2];
      	}
    } else if (lrgb[1] <= lrgb[0] && lrgb[1] <= lrgb[2]) {
      	weights[0] = lrgb[1];

      	if (lrgb[0] <= lrgb[2]) {
            weights[2] = lrgb[0] - lrgb[1];
            weights[6] = lrgb[2] - lrgb[0];
      	} else {
            weights[2] = lrgb[2] - lrgb[1];
            weights[4] = lrgb[0] - lrgb[2];
      	}
    } else if (lrgb[2] <= lrgb[0] && lrgb[2] <= lrgb[1]) {
      	weights[0] = lrgb[2];

      	if (lrgb[0] <= lrgb[1]) {
            weights[3] = lrgb[0] - lrgb[2];
            weights[5] = lrgb[1] - lrgb[0];
        } else {
        	weights[3] = lrgb[1] - lrgb[2];
          	weights[4] = lrgb[0] - lrgb[1];
    	}
	}
}

void spectral_linear_to_reflectance(vec3 lrgb, inout float R[SPECTRAL_SIZE]) {
    float weights[7];
    spectral_weights(lrgb, weights);
    
     R[0] = weights[0] + weights[1] * 0.96853629 + weights[2] * 0.51567122 + weights[3] * 0.02055257 + weights[4] * 0.03147571 + weights[5] * 0.49108579 + weights[6] * 0.97901834;
     R[1] = weights[0] + weights[1] * 0.96855103 + weights[2] * 0.54015520 + weights[3] * 0.02059936 + weights[4] * 0.03146636 + weights[5] * 0.46944057 + weights[6] * 0.97901649;
     R[2] = weights[0] + weights[1] * 0.96859338 + weights[2] * 0.62645502 + weights[3] * 0.02062723 + weights[4] * 0.03140624 + weights[5] * 0.40165780 + weights[6] * 0.97901118;
     R[3] = weights[0] + weights[1] * 0.96877345 + weights[2] * 0.75595012 + weights[3] * 0.02073387 + weights[4] * 0.03119611 + weights[5] * 0.24490420 + weights[6] * 0.97892146;
     R[4] = weights[0] + weights[1] * 0.96942204 + weights[2] * 0.92826996 + weights[3] * 0.02114202 + weights[4] * 0.03053888 + weights[5] * 0.06826880 + weights[6] * 0.97858555;
     R[5] = weights[0] + weights[1] * 0.97143709 + weights[2] * 0.97223624 + weights[3] * 0.02233154 + weights[4] * 0.02856855 + weights[5] * 0.02732883 + weights[6] * 0.97743705;
     R[6] = weights[0] + weights[1] * 0.97541862 + weights[2] * 0.98616174 + weights[3] * 0.02556857 + weights[4] * 0.02459485 + weights[5] * 0.01360600 + weights[6] * 0.97428075;
     R[7] = weights[0] + weights[1] * 0.98074186 + weights[2] * 0.98955255 + weights[3] * 0.03330189 + weights[4] * 0.01929520 + weights[5] * 0.01000187 + weights[6] * 0.96663223;
     R[8] = weights[0] + weights[1] * 0.98580992 + weights[2] * 0.98676237 + weights[3] * 0.05185294 + weights[4] * 0.01423112 + weights[5] * 0.01284127 + weights[6] * 0.94822893;
     R[9] = weights[0] + weights[1] * 0.98971194 + weights[2] * 0.97312575 + weights[3] * 0.10087639 + weights[4] * 0.01033111 + weights[5] * 0.02636635 + weights[6] * 0.89937713;
    R[10] = weights[0] + weights[1] * 0.99238027 + weights[2] * 0.91944277 + weights[3] * 0.24000413 + weights[4] * 0.00765876 + weights[5] * 0.07058713 + weights[6] * 0.76070164;
    R[11] = weights[0] + weights[1] * 0.99409844 + weights[2] * 0.32564851 + weights[3] * 0.53589066 + weights[4] * 0.00593693 + weights[5] * 0.70421692 + weights[6] * 0.46420440;
    R[12] = weights[0] + weights[1] * 0.99517200 + weights[2] * 0.13820628 + weights[3] * 0.79874659 + weights[4] * 0.00485616 + weights[5] * 0.85473994 + weights[6] * 0.20123039;
    R[13] = weights[0] + weights[1] * 0.99576545 + weights[2] * 0.05015143 + weights[3] * 0.91186529 + weights[4] * 0.00426186 + weights[5] * 0.95081565 + weights[6] * 0.08808402;
    R[14] = weights[0] + weights[1] * 0.99593552 + weights[2] * 0.02912336 + weights[3] * 0.95399623 + weights[4] * 0.00409039 + weights[5] * 0.97170370 + weights[6] * 0.04592894;
    R[15] = weights[0] + weights[1] * 0.99564041 + weights[2] * 0.02421691 + weights[3] * 0.97137099 + weights[4] * 0.00438375 + weights[5] * 0.97651888 + weights[6] * 0.02860373;
    R[16] = weights[0] + weights[1] * 0.99464769 + weights[2] * 0.02660696 + weights[3] * 0.97939505 + weights[4] * 0.00537525 + weights[5] * 0.97429245 + weights[6] * 0.02060067;
    R[17] = weights[0] + weights[1] * 0.99229579 + weights[2] * 0.03407586 + weights[3] * 0.98345207 + weights[4] * 0.00772962 + weights[5] * 0.97012917 + weights[6] * 0.01656701;
    R[18] = weights[0] + weights[1] * 0.98638762 + weights[2] * 0.04835936 + weights[3] * 0.98553736 + weights[4] * 0.01366120 + weights[5] * 0.94258630 + weights[6] * 0.01451549;
    R[19] = weights[0] + weights[1] * 0.96829712 + weights[2] * 0.00011720 + weights[3] * 0.98648905 + weights[4] * 0.03181352 + weights[5] * 0.99989207 + weights[6] * 0.01357964;
    R[20] = weights[0] + weights[1] * 0.89228016 + weights[2] * 0.00008554 + weights[3] * 0.98674535 + weights[4] * 0.10791525 + weights[5] * 0.99989891 + weights[6] * 0.01331243;
    R[21] = weights[0] + weights[1] * 0.53740239 + weights[2] * 0.85267882 + weights[3] * 0.98657555 + weights[4] * 0.46249516 + weights[5] * 0.13823139 + weights[6] * 0.01347661;
    R[22] = weights[0] + weights[1] * 0.15360445 + weights[2] * 0.93188793 + weights[3] * 0.98611877 + weights[4] * 0.84604333 + weights[5] * 0.06968113 + weights[6] * 0.01387181;
    R[23] = weights[0] + weights[1] * 0.05705719 + weights[2] * 0.94810268 + weights[3] * 0.98559942 + weights[4] * 0.94275572 + weights[5] * 0.05628787 + weights[6] * 0.01435472;
    R[24] = weights[0] + weights[1] * 0.03126539 + weights[2] * 0.94200977 + weights[3] * 0.98507063 + weights[4] * 0.96860996 + weights[5] * 0.06111561 + weights[6] * 0.01479836;
    R[25] = weights[0] + weights[1] * 0.02205445 + weights[2] * 0.91478045 + weights[3] * 0.98460039 + weights[4] * 0.97783966 + weights[5] * 0.08987709 + weights[6] * 0.01515250;
    R[26] = weights[0] + weights[1] * 0.01802271 + weights[2] * 0.87065445 + weights[3] * 0.98425301 + weights[4] * 0.98187757 + weights[5] * 0.13656016 + weights[6] * 0.01540513;
    R[27] = weights[0] + weights[1] * 0.01613460 + weights[2] * 0.78827548 + weights[3] * 0.98403909 + weights[4] * 0.98377315 + weights[5] * 0.22169624 + weights[6] * 0.01557233;
    R[28] = weights[0] + weights[1] * 0.01520947 + weights[2] * 0.65738359 + weights[3] * 0.98388535 + weights[4] * 0.98470202 + weights[5] * 0.32176956 + weights[6] * 0.01565710;
    R[29] = weights[0] + weights[1] * 0.01475977 + weights[2] * 0.59909403 + weights[3] * 0.98376116 + weights[4] * 0.98515481 + weights[5] * 0.36157329 + weights[6] * 0.01571025;
    R[30] = weights[0] + weights[1] * 0.01454263 + weights[2] * 0.56817268 + weights[3] * 0.98368246 + weights[4] * 0.98537114 + weights[5] * 0.48361920 + weights[6] * 0.01571916;
    R[31] = weights[0] + weights[1] * 0.01444459 + weights[2] * 0.54031997 + weights[3] * 0.98365023 + weights[4] * 0.98546685 + weights[5] * 0.46488579 + weights[6] * 0.01572133;
    R[32] = weights[0] + weights[1] * 0.01439897 + weights[2] * 0.52110241 + weights[3] * 0.98361309 + weights[4] * 0.98550011 + weights[5] * 0.47440306 + weights[6] * 0.01572502;
    R[33] = weights[0] + weights[1] * 0.01437620 + weights[2] * 0.51041094 + weights[3] * 0.98357259 + weights[4] * 0.98551031 + weights[5] * 0.48576990 + weights[6] * 0.01571717;
    R[34] = weights[0] + weights[1] * 0.01436343 + weights[2] * 0.50526577 + weights[3] * 0.98353856 + weights[4] * 0.98550741 + weights[5] * 0.49267971 + weights[6] * 0.01571905;
    R[35] = weights[0] + weights[1] * 0.01435687 + weights[2] * 0.50255080 + weights[3] * 0.98351247 + weights[4] * 0.98551323 + weights[5] * 0.49625685 + weights[6] * 0.01571059;
    R[36] = weights[0] + weights[1] * 0.01435370 + weights[2] * 0.50126452 + weights[3] * 0.98350101 + weights[4] * 0.98551563 + weights[5] * 0.49807754 + weights[6] * 0.01569728;
    R[37] = weights[0] + weights[1] * 0.01435408 + weights[2] * 0.50083021 + weights[3] * 0.98350852 + weights[4] * 0.98551547 + weights[5] * 0.49889859 + weights[6] * 0.01570020;
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
