import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CandyRain3D } from "./CandyRain3D";

const captions: Record<string, string> = {
  s01: "WHAT IF THE SKY RAINED CANDY?",
  s02: "A sugary surprise for the whole city…",
  s03: "Real clouds are water droplets and ice.",
  s04: "Gravity • size • shape • air resistance",
  s05: "Hard candy stings. Gummies go splat.",
  s06: "Sugar melts into sticky runoff.",
  s07: "Microbes use oxygen as they break down sugar.",
  s08: "MAGICAL NOW. STICKY MUCH LONGER.",
};
const City: React.FC<{ dark?: boolean }> = ({ dark = false }) => {
  const main = dark ? "#273456" : "#57426e";
  const roof = dark ? "#1d2947" : "#45344f";
  const win = dark ? "#f6ce89" : "#ffe9a9";
  return <g>
    <path d="M0 850 Q130 750 280 825 Q430 710 580 820 Q760 720 925 820 Q1015 760 1080 800 V1500 H0Z" fill="#ffffff" opacity=".11"/>
    <g opacity=".62" fill={dark ? "#3b5574" : "#736180"} stroke="#e5b8c2" strokeWidth="5">
      <path d="M-15 1230 V1035 Q80 930 170 1035 V1230Z"/><path d="M175 1230 V1005 Q245 930 315 1005 V1230Z"/>
      <path d="M770 1230 V1010 Q845 920 920 1010 V1230Z"/><path d="M910 1230 V1045 Q1000 955 1095 1045 V1230Z"/>
      <path d="M-15 1040 Q80 930 170 1040 M175 1010 Q245 930 315 1010 M770 1015 Q845 920 920 1015 M910 1050 Q1000 955 1095 1050" fill="none" stroke="#f5d0b9" strokeWidth="8"/>
    </g>
    <path d="M0 1237 Q135 1213 260 1239 T525 1222 T800 1235 T1080 1215" fill="none" stroke="#efb7c2" strokeWidth="8" opacity=".75"/>
    <path d="M0 1150 Q130 1100 245 1160 L245 900 Q245 850 285 850 Q325 850 325 900 L325 1150 L395 1180 L395 830 L495 830 L495 980 Q530 915 565 980 L565 1190 Q700 1115 815 1170 L815 910 Q815 860 855 860 Q895 860 895 910 L895 1170 Q1000 1110 1080 1160 V1610 H0Z" fill={main} stroke="#f3c7cb" strokeWidth="8"/>
    <path d="M25 1152 L25 1000 Q95 920 165 1000 L165 1158 M395 830 L445 720 L495 830 M815 910 L855 780 L895 910 M920 1180 L920 1030 Q970 965 1020 1030 L1020 1160" fill={roof} stroke="#f3c7cb" strokeWidth="8" strokeLinejoin="round"/>
    <path d="M423 717 Q445 670 467 717 M840 780 Q855 730 870 780" fill="none" stroke="#ffd590" strokeWidth="7"/>
    {Array.from({ length: 18 }, (_, i) => { const x = 25 + (i % 6) * 170, y = 1010 + Math.floor(i / 6) * 130; return <g key={i}><rect x={x} y={y} width="44" height="62" rx="16" fill={win} opacity={i % 4 === 0 ? .45 : .85}/><path d={`M${x+22} ${y}v62 M${x} ${y+31}h44`} stroke={roof} strokeWidth="5"/></g>; })}
    <path d="M0 1460 Q200 1400 430 1468 T850 1448 T1080 1460 V1720 H0Z" fill="#344c67"/>
    <path d="M0 1530 Q245 1495 490 1535 T1080 1520" fill="none" stroke="#a5e5db" strokeWidth="9" opacity=".7"/>
  </g>;
};

const Girl: React.FC<{ x?: number; y?: number; umbrella?: boolean; surprised?: boolean }> = ({ x = 535, y = 1380, umbrella = false, surprised = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bob = Math.sin(frame / fps * 3.4) * 7;
  const blink = frame % 127 >= 43 && frame % 127 <= 47;
  const pupilDrift = Math.sin(frame / fps * 1.4) * 3.5;
  const umbrellaTilt = Math.sin(frame / fps * 1.9) * 1.6;
  return (
  <g transform={`translate(${x} ${y + bob})`} stroke="#302846" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round">
    {umbrella && <g transform={`rotate(${umbrellaTilt} 0 -135)`}><path d="M-175 -135 Q0 -340 175 -135 Q125 -165 85 -118 Q40 -170 0 -118 Q-45 -170 -90 -118 Q-135 -165 -175 -135Z" fill="#8ee9df" stroke="#fff1d8" strokeWidth="8"/><path d="M0 -138 V12 Q0 50 40 50" fill="none" strokeWidth="10"/></g>}
    <path d="M-108 80 L-120 255 L-45 255 L-25 145 L30 145 L55 255 L130 255 L110 80Z" fill="#ffd05e"/>
    <path d="M-105 190 L-126 310 L-50 310 L-28 220 M74 210 L88 310 L158 310 L128 190" fill="#41bfc5"/>
    <path d="M-140 310 Q-80 287 -35 310 L-27 340 Q-92 362 -150 341Z M78 310 Q133 290 178 315 L183 342 Q126 363 80 341Z" fill="#353e64"/>
    <path d="M-105 18 Q-157 52 -126 160 L-65 175 L-35 105 L48 105 L75 174 L137 151 Q151 64 102 20Z" fill="#ffca50"/>
    <path d="M-90 68 Q-140 110 -185 155 M100 65 Q140 110 176 150" fill="none" strokeWidth="25"/>
    <path d="M-47 -18 Q-87 -92 -34 -148 Q14 -205 83 -157 Q130 -121 92 -29 L70 34 L-35 38Z" fill="#3a2e52"/>
    <ellipse cx="0" cy="-58" rx="72" ry="82" fill="#ffd5b1"/>
    <path d="M-72 -79 Q-67 -170 8 -174 Q94 -175 91 -83 L59 -105 Q20 -131 -18 -97 L-56 -49Z" fill="#352b4c"/>
    <path d="M-53 -59 Q-37 -73 -20 -59 M30 -59 Q48 -73 63 -59" fill="none" strokeWidth="8"/>
    <ellipse cx={-37 + pupilDrift} cy="-43" rx="9" ry={blink ? 1.5 : 15} fill="#715296" stroke="none"/><ellipse cx={47 + pupilDrift} cy="-43" rx="9" ry={blink ? 1.5 : 15} fill="#715296" stroke="none"/>
    <path d={surprised ? "M-9 -11 Q0 -1 9 -11 Q0 9 -9 -11Z" : "M-17 -8 Q0 9 18 -8"} fill="#b54f68" strokeWidth="5"/>
    <path d="M-80 83 L-35 104 L-60 167 M70 101 L105 82 L125 148" fill="none" stroke="#fff2ca" strokeWidth="6"/>
  </g>
  );
};

const Scene: React.FC<{ id: string }> = ({ id }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entering = interpolate(f, [0, 18], [0.94, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const pushIn = interpolate(f, [0, durationInFrames], [1, 1.035], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const panX = Math.sin(f / Math.max(1, durationInFrames) * Math.PI) * (id === "s04" ? -0.75 : 0.55);
  const sky = id === "s03" ? ["#18274d", "#7d86c2"] : id === "s07" ? ["#0e4160", "#64cdb8"] : ["#222746", "#d17a89"];
  const caption = captions[id];
  const footerIn = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return <AbsoluteFill style={{ background: sky[0], overflow: "hidden" }}>
    <svg viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ transform: `scale(${entering * pushIn}) translateX(${panX}%)`, transformOrigin: "50% 50%" }}>
      <defs>
        <linearGradient id="sky" x2="0" y2="1"><stop stopColor={sky[0]}/><stop offset="1" stopColor={sky[1]}/></linearGradient>
        <linearGradient id="coat" x2="0" y2="1"><stop stopColor="#ffe276"/><stop offset="1" stopColor="#f9a94a"/></linearGradient>
        <radialGradient id="glow"><stop stopColor="#fff3ce" stopOpacity=".8"/><stop offset="1" stopColor="#ffc9de" stopOpacity="0"/></radialGradient>
        <filter id="softShadow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceAlpha" stdDeviation="10"/><feOffset dy="9"/><feComponentTransfer><feFuncA type="linear" slope=".36"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="1080" height="1920" fill="url(#sky)"/>
      <circle cx="820" cy="370" r="370" fill="url(#glow)"/>
      <circle cx="820" cy="370" r="100" fill="#ffe4b1" opacity=".82"/>
      {Array.from({ length: 26 }, (_, i) => <circle key={`star${i}`} cx={(i*197+47)%1080} cy={(i*131+80)%780} r={i%3===0?5:3} fill="#fff2d8" opacity={.25 + .5*Math.abs(Math.sin(i*3.1))}/>) }
      {id === "s03" && <g opacity=".92"><path d="M230 575 Q210 480 310 475 Q350 360 465 430 Q540 340 625 433 Q745 418 743 520 Q820 565 768 630 H300 Q220 630 230 575Z" fill="#f4f4ff" stroke="#c6d9ff" strokeWidth="9"/><g fill="#9cc7fa" opacity=".9">{[350,430,510,590,670].map((x,i)=><circle key={x} cx={x} cy={510+(i%2)*28} r="11"/>)}</g><text x="540" y="655" textAnchor="middle" fill="#fff" fontSize="35" fontFamily="Arial" fontWeight="700">WATER DROPLETS + ICE</text><text x="540" y="703" textAnchor="middle" fill="#ffd4ec" fontSize="30" fontFamily="Arial">candy takes a little magic ✦</text></g>}
      {id === "s07" ? <g><path d="M0 1120 Q160 1050 320 1120 T650 1115 T1080 1090 V1640 H0Z" fill="#56bba9" stroke="#b4eee0" strokeWidth="8"/><path d="M0 1290 Q220 1210 430 1288 T830 1270 T1080 1230" fill="none" stroke="#d1fff5" strokeWidth="20" opacity=".5"/>{Array.from({length:22},(_,i)=><circle key={i} cx={(i*181+70)%1080} cy={1190+(i*77)%350} r={9+(i%4)*4} fill="#e9ffff" opacity=".65"/>)}<path d="M700 1370 q55 -38 105 0 q-50 42 -105 0 M786 1370 l32 -28 v56Z" fill="#ffcf72" stroke="#334e65" strokeWidth="6"/><path d="M260 1280 q45 -30 86 0 q-43 35 -86 0 M324 1280 l28 -23 v46Z" fill="#ff9f91" stroke="#334e65" strokeWidth="6"/><text x="540" y="1050" textAnchor="middle" fill="#fff" fontSize="34" fontFamily="Arial" fontWeight="700">TOO MUCH SUGAR CAN AFFECT OXYGEN</text></g> : <City dark={id === "s06"}/ >}
      {id === "s06" && <g><path d="M0 1480 Q200 1448 410 1480 T830 1470 T1080 1450" fill="none" stroke="#83eff1" strokeWidth="32" opacity=".92"/><path d="M700 1450 L700 1580 Q700 1630 755 1630 H860" fill="none" stroke="#233650" strokeWidth="60"/><ellipse cx="860" cy="1630" rx="65" ry="26" fill="#15253c"/><text x="520" y="1600" fill="#fff0d3" fontSize="28" fontFamily="Arial">SWEET RUNOFF</text></g>}
      {Array.from({ length: (id === "s06" || id === "s07") ? 44 : 0 }, (_, i) => {
        const x = (i * 193 + 33) % 1080;
        const y = ((i * 127 + f * (13 + i % 7)) % 1920);
        return <path key={`rain${i}`} d={`M${x} ${y} l-22 92`} stroke={id === "s07" ? "#b8fff5" : "#c9e8ff"} strokeWidth={i % 4 === 0 ? 5 : 3} strokeLinecap="round" opacity={id === "s07" ? 0.20 : 0.35} />;
      })}
      {(id === "s01" || id === "s02" || id === "s05" || id === "s08") && <Girl x={id === "s02" ? 600 : 540} y={id === "s02" ? 1400 : 1390} umbrella={id === "s02" || id === "s05"} surprised={id === "s05"}/>}
      {id === "s04" && <g><path d="M120 550 Q500 470 950 575 M120 860 Q520 760 950 890 M130 1180 Q510 1090 950 1200" fill="none" stroke="#c9e5fa" strokeWidth="6" opacity=".55" strokeDasharray="20 22"/><rect x="185" y="465" width="710" height="88" rx="32" fill="#18233c" opacity=".88"/><text x="540" y="520" textAnchor="middle" fill="#fff" fontSize="40" fontFamily="Arial" fontWeight="700">SIZE + SHAPE + AIR DRAG</text></g>}
      {id === "s05" && <g><path d="M140 1010 Q530 960 940 1020" stroke="#fff0d7" strokeWidth="12" fill="none" strokeDasharray="18 20"/><text x="540" y="1080" textAnchor="middle" fill="#fff5dd" fontSize="30" fontFamily="Arial">impact depends on size and speed</text></g>}
      <g opacity={interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" })} transform={`translate(0 ${interpolate(f, [0, 8], [-20, 0], { extrapolateRight: "clamp" })})`}>
        <rect x="44" y="55" width="255" height="78" rx="39" fill="#fff5de" opacity=".96"/><text x="171" y="109" textAnchor="middle" fill="#e53651" fontSize="35" fontFamily="Arial" fontWeight="900" letterSpacing="2">WHAT IF</text>
      </g>
      <g opacity={footerIn} transform={`translate(0 ${interpolate(f, [0, 12], [30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) })})`}>
        <rect x="60" y="1660" width="960" height="194" rx="34" fill="#111a32" opacity=".84" stroke="#ffffff" strokeOpacity=".35" strokeWidth="3"/>
        <text x="540" y="1742" textAnchor="middle" fill={id === "s01" || id === "s08" ? "#ff5269" : "#ffe9c1"} fontSize={id === "s01" ? 43 : 34} fontFamily="Arial" fontWeight="900" letterSpacing="1">{caption}</text>
        {id === "s01" && <text x="540" y="1810" textAnchor="middle" fill="#fff8e8" fontSize="28" fontFamily="Arial">A little wonder. A lot of sticky science.</text>}
        {id === "s08" && <text x="540" y="1810" textAnchor="middle" fill="#fff5df" fontSize="27" fontFamily="Arial">What would YOU do first?</text>}
      </g>
      <rect x="0" y="0" width="1080" height="1920" fill="none" stroke="#fff4d8" strokeOpacity=".16" strokeWidth="18"/>
    </svg>
    <CandyRain3D scene={id} />
  </AbsoluteFill>;
};

export const s01: React.FC = () => <Scene id="s01"/>;
export const s02: React.FC = () => <Scene id="s02"/>;
export const s03: React.FC = () => <Scene id="s03"/>;
export const s04: React.FC = () => <Scene id="s04"/>;
export const s05: React.FC = () => <Scene id="s05"/>;
export const s06: React.FC = () => <Scene id="s06"/>;
export const s07: React.FC = () => <Scene id="s07"/>;
export const s08: React.FC = () => <Scene id="s08"/>;
