import type { ReactNode } from "react";
import { eye, hairSilhouette, head, irisCenter, lip, mirror } from "./face-chart-geometry";

const leftLocks = "M46 183C26 155 20 124 29 93C42 39 103 5 166 12C172 13 176 17 176 21C139 25 123 54 97 71C72 88 48 118 46 151C45 162 48 173 46 183ZM44 174C51 198 44 228 40 254C35 291 52 301 60 326C40 320 29 298 27 283C22 263 33 231 35 210C36 195 34 184 35 177Z";
const rightLocks = "M163 13C193 5 237 17 265 43C293 69 310 110 295 149C291 160 285 176 274 189C284 159 274 128 257 108C237 83 219 79 205 65C191 52 187 34 164 27Z M290 163C285 198 284 215 291 238C298 260 312 286 303 308C296 324 286 329 274 330C287 312 288 294 280 274C268 243 267 231 276 195Z";
const leftStrands = "M155 21C143 19 118 25 93 38C68 52 50 70 42 101M163 24C141 34 129 50 111 62C84 79 63 105 52 132M82 53C62 69 44 87 36 122C31 144 35 157 39 168M42 194C47 221 32 251 35 275C37 291 44 303 50 314M26 248C19 289 29 307 41 321";
const rightStrands = "M178 22C207 21 248 35 268 65C279 81 288 101 288 125M181 27C208 36 210 58 241 81C266 100 281 129 284 157M235 29C280 46 302 103 296 134M288 198C283 226 295 251 300 278C303 292 297 311 286 320M282 234C284 257 301 297 282 318";
const ear = "M49 180C38 171 26 176 23 188C17 204 26 225 42 236C48 241 55 241 61 238L60 223Z";
const upperLid = "M77 189C85 181 94 174 107 174C122 173 134 182 143 197";
const lowerLid = "M79 191C88 201 97 207 106 207C120 207 134 200 142 197";
const brow = "M80 161C93 150 106 150 117 153C127 156 133 159 138 163C120 157 109 155 98 157C90 157 85 159 80 161Z";
const browHairs = "M87 158q3-2 7-3m-2 3q4-4 8-4m-2 3q3-4 7-4m-2 4q4-4 8-3m-3 3q4-3 8-2m-3 2q5-2 8 0m-3 1q4-2 8 0m-3 1q4-1 8 1m-2 0 6 2";
const lipSeam = "M128 287C138 291 146 285 153 285C157 284 159 287 161 287C165 285 169 285 174 287C181 289 187 291 192 287";

const irisGrain = Array.from({ length: 54 }, (_, index) => {
  const angle = index * Math.PI * 2 / 54;
  const inner = 8 + Math.sin(index * 2) * 1.9;
  const outer = 17.8 + Math.cos(index * 3) * 2.5;
  return `M${(Math.cos(angle) * inner).toFixed(2)} ${(Math.sin(angle) * inner).toFixed(2)}Q${(Math.cos(angle - .07) * 14).toFixed(2)} ${(Math.sin(angle - .07) * 14).toFixed(2)} ${(Math.cos(angle + .03) * outer).toFixed(2)} ${(Math.sin(angle + .03) * outer).toFixed(2)}`;
}).join("");

export function mix(first: string, second: string, amount: number) {
  let mixed = "#";
  for (const start of [1, 3, 5]) {
    const a = Number.parseInt(first.slice(start, start + 2), 16);
    const b = Number.parseInt(second.slice(start, start + 2), 16);
    mixed += Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  }
  return mixed;
}

export function FacePortrait({ id, skin, iris, hair, hairVisible, hideBrows, children }: {
  id: string;
  skin: string;
  iris: string;
  hair: string;
  hairVisible: boolean;
  hideBrows?: boolean;
  children: ReactNode;
}) {
  const ink = mix(skin, "#261924", .87);
  const shade = mix(skin, "#542F39", .43);
  const light = mix(skin, "#FFF4E8", .2);
  const rose = mix(skin, "#A95769", .48);
  const lashInk = "#2D202A";
  const blush = `url(#${id}-bare-rose)`;
  const softShadow = `url(#${id}-skin-shadow)`;
  const highlight = `url(#${id}-skin-light)`;
  const hairGloss = mix(hair, "#F3C9A6", .53);
  const hairFill = `url(#${id}-hair)`;

  return <>
    <defs>
      <radialGradient id={`${id}-skin`} cx="47%" cy="35%" r="71%">
        <stop stopColor={mix(skin, light, .53)}/>
        <stop offset="67%" stopColor={skin}/>
        <stop offset="100%" stopColor={mix(skin, shade, .49)}/>
      </radialGradient>
      <radialGradient id={`${id}-skin-shadow`}>
        <stop stopColor={shade} stopOpacity=".42"/><stop offset="100%" stopColor={shade} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={`${id}-skin-light`}>
        <stop stopColor={light} stopOpacity=".84"/><stop offset="100%" stopColor={light} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={`${id}-bare-rose`}>
        <stop stopColor={rose} stopOpacity=".53"/><stop offset="70%" stopColor={rose} stopOpacity=".16"/><stop offset="100%" stopColor={rose} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={`${id}-lip`} cx="51%" cy="48%" r="58%">
        <stop stopColor={mix(rose, "#853F59", .22)} stopOpacity=".92"/>
        <stop offset="57%" stopColor={rose} stopOpacity=".66"/>
        <stop offset="100%" stopColor={rose} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={`${id}-iris`} cx="48%" cy="64%" r="56%">
        <stop stopColor={mix(iris, "#4D2F44", .4)}/>
        <stop offset="45%" stopColor={mix(iris, "#D6A8BA", .21)}/>
        <stop offset="71%" stopColor={iris}/>
        <stop offset="94%" stopColor={mix(iris, "#241A29", .66)}/>
        <stop offset="100%" stopColor="#241A29"/>
      </radialGradient>
      <radialGradient id={`${id}-pupil`}>
        <stop offset="61%" stopColor="#201622"/><stop offset="88%" stopColor="#241825" stopOpacity=".92"/>
        <stop offset="100%" stopColor="#261928" stopOpacity="0"/>
      </radialGradient>
      <linearGradient id={`${id}-sclera`} x2="0" y2="1">
        <stop stopColor="#9D7B83"/><stop offset="55%" stopColor="#D5BEBF"/><stop offset="100%" stopColor="#E6CECC"/>
      </linearGradient>
      <linearGradient id={`${id}-lid-shadow`} x2="0" y2="1">
        <stop stopColor="#2B1D2B" stopOpacity=".71"/><stop offset="46%" stopColor="#30232D" stopOpacity=".29"/>
        <stop offset="89%" stopColor="#372733" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id={`${id}-hair`} x2=".79" y2="1">
        <stop stopColor={mix(hair, light, .27)}/><stop offset="47%" stopColor={hair}/><stop offset="100%" stopColor={mix(hair, "#23191E", .45)}/>
      </linearGradient>
      <radialGradient id={`${id}-lock`} cx="49%" cy="23%" r="72%">
        <stop stopColor={mix(hair, hairGloss, .62)}/><stop offset="41%" stopColor={hair}/>
        <stop offset="100%" stopColor={mix(hair, "#1C1420", .46)}/>
      </radialGradient>
      <clipPath id={`${id}-eye`}><path d={eye}/></clipPath>
      <filter id={`${id}-lip-edge`} x="-12%" y="-22%" width="124%" height="144%">
        <feGaussianBlur stdDeviation="1.3"/>
      </filter>
    </defs>
    {hairVisible && <path d={hairSilhouette} fill={hairFill} data-hair-illustration="true"/>}
    {[undefined, mirror].map((transform, index) => <g key={index} transform={transform}>
      <path d={ear} fill={skin} stroke={shade} strokeWidth="1.36"/>
      <ellipse cx="41" cy="208" rx="15" ry="24" fill={blush} transform="rotate(-16 41 208)"/>
      <path d="M44 187C32 180 28 190 33 203C37 213 42 220 50 223" fill="none" stroke={shade} strokeWidth=".92" opacity=".53"/>
      <path d="M38 200C39 212 48 221 52 224" fill="none" stroke={light} strokeWidth="2" opacity=".62"/>
    </g>)}
    <path d={head} fill={`url(#${id}-skin)`} stroke={ink} strokeWidth="2.9" strokeOpacity=".18"/>
    <path d={head} fill="none" stroke={ink} strokeWidth="1.46" strokeOpacity=".78" data-face-feature="outline"/>
    <g clipPath={`url(#${id}-head)`}>
      <ellipse cx="156" cy="114" rx="104" ry="90" fill={highlight} opacity=".39"/>
      <ellipse cx="146" cy="199" rx="8" ry="34" fill={softShadow} transform="rotate(7 146 199)" opacity=".39"/>
      <ellipse cx="173" cy="200" rx="9" ry="34" fill={softShadow} transform="rotate(-8 173 200)" opacity=".52"/>
      <ellipse cx="159" cy="215" rx="7" ry="28" fill={highlight} opacity=".62"/>
      <ellipse cx="160" cy="242" rx="19" ry="12" fill={blush} opacity=".61"/>
      <ellipse cx="160" cy="244" rx="13" ry="7" fill={highlight} opacity=".74"/>
      <ellipse cx="160" cy="319" rx="40" ry="16" fill={highlight} opacity=".6"/>
      {[undefined, mirror].map((transform, index) => <g key={index} transform={transform}>
        <ellipse cx="97" cy="228" rx="47" ry="22" fill={highlight} transform="rotate(-20 97 228)" opacity=".47"/>
        <ellipse cx="102" cy="210" rx="35" ry="12" fill={blush} transform="rotate(9 102 210)" opacity=".57"/>
        <ellipse cx="77" cy="241" rx="29" ry="50" fill={softShadow} transform="rotate(-27 77 241)" opacity=".43"/>
      </g>)}
      <ellipse cx="160" cy="306" rx="26" ry="9" fill={softShadow} opacity=".63"/>
    </g>
    <path d={lip} fill={`url(#${id}-lip)`} filter={`url(#${id}-lip-edge)`}/>
    {children}
    <g data-face-feature="nose" fill="none" stroke={ink}>
      <path d="M148 238C142 244 144 252 148 254M172 238C178 244 177 252 172 254" opacity=".67" strokeWidth="1.06"/>
      <path d="M152 251Q156 250 158 254M168 251Q164 250 162 254" opacity=".56" strokeWidth="1.32"/>
      <path d="M158 256Q161 257 164 255" opacity=".33" strokeWidth=".79"/>
    </g>
    <path d={lipSeam} stroke={ink} fill="none" strokeWidth="1.17" opacity=".82" data-face-feature="lip-seam"/>
    <path d="M151 279l2-.5m4-.4 1.9.4m5-.1 2-.5m-15 16q3.5 1.3 6 1.4m2 .4 1 .1m3 0q1.7-.03 2.7-.6m2.8-.3 3.1-.9"
      stroke="#FFF3E9" strokeWidth=".92" fill="none" opacity=".53"/>
    {[undefined, mirror].map((transform, index) => <g key={index} transform={transform} data-face-feature="eye">
      <ellipse cx="107" cy="173" rx="38" ry="16" fill={softShadow} opacity=".43"/>
      {!hideBrows && <>
        <path d={brow} fill={mix(skin, hair, .52)} opacity=".38"/>
        <path d={browHairs} stroke={mix(hair, ink, .36)} strokeWidth=".52" opacity=".53" fill="none"/>
      </>}
      <path d="M78 179C91 166 109 163 122 170C132 174 138 182 142 187" stroke={ink} strokeWidth="1" opacity=".63" fill="none"/>
      <path d={eye} fill={`url(#${id}-sclera)`}/>
      <g clipPath={`url(#${id}-eye)`}>
        <circle cx={irisCenter.x} cy={irisCenter.y} r="20.6" fill={`url(#${id}-iris)`}/>
        <path d={irisGrain} transform={`translate(${irisCenter.x} ${irisCenter.y})`} stroke={mix(iris, "#C9A4C5", .61)}
          strokeWidth=".53" opacity=".34" fill="none"/>
        <circle cx={irisCenter.x} cy={irisCenter.y} r="12.2" fill={`url(#${id}-pupil)`}/>
        <path d={eye} fill={`url(#${id}-lid-shadow)`}/>
        <ellipse cx="113" cy="182.8" rx="2.52" ry="2.16" fill="#FFFAF2"/>
        <circle cx="105" cy="198" r="1.19" fill="#F1D8EB" opacity=".68"/>
        <path d="M97 199Q104 207 113 204M123 200l1.5-1.5" fill="none" stroke="#DAB3CA" strokeWidth=".73" opacity=".57"/>
        <path d="M141 195l5 3-8 2.5" fill={rose} opacity=".61"/>
      </g>
      <path d="M77 189C86 181 94 174 107 174C119 173 131 180 138 189C129 181 119 177 108 177C96 177 85 183 79 192Z"
        fill={lashInk} opacity=".91"/>
      <path d={upperLid} fill="none" stroke={lashInk} strokeWidth="1.28"/>
      <path d={lowerLid} fill="none" stroke={ink} strokeWidth=".94" opacity=".68"/>
      <path d="M81 195C93 207 104 212 119 207C125 205 131 202 136 200" stroke={rose} strokeWidth="1.28" opacity=".68" fill="none"/>
      <path d="M82 186q-3-1-4-3m7 1q-3-2-3.1-4m7 1q-2.1-2.1-2.1-4.1" fill="none"
        stroke={lashInk} strokeWidth=".61" opacity=".84"/>
    </g>)}
    {hairVisible && <g aria-hidden="true">
      <path d={leftLocks} fill={`url(#${id}-lock)`}/>
      <path d={rightLocks} fill={`url(#${id}-lock)`}/>
      <path d={leftStrands} stroke={hairGloss} strokeWidth=".9" fill="none" opacity=".42"/>
      <path d={rightStrands} stroke={hairGloss} strokeWidth="1.05" fill="none" opacity=".37"/>
      <path d="M132 24C83 34 45 70 36 113M197 25C247 33 279 67 288 105" stroke={hairGloss}
        strokeWidth="2.2" fill="none" opacity=".21"/>
    </g>}
  </>;
}
