import htm from "https://cdn.skypack.dev/htm";
import { h } from "https://cdn.skypack.dev/preact";
import "https://cdn.skypack.dev/preact/debug";
import { useEffect, useState } from "https://cdn.skypack.dev/preact/hooks";
const html = htm.bind(h);

import {JC, pass} from "./global_snippets.js";

import IdenticonObject from "https://cdn.skypack.dev/identicon.js";
import md5 from "https://cdn.skypack.dev/md5";
import QRCode from "https://cdn.skypack.dev/qrcode";

export function Picto({ name }) {
  return html` <i class="fa-solid fa-${name}"></i> `;
}

export function Identicon({ ident }) {
  const ident_hash = md5(ident);
  const ident_data = new IdenticonObject(ident_hash);
  return html`
    <img class="identicon" src="data:image/png;base64,${ident_data}" />
  `;
}

export function QR({ data }) {
  const [qr_data_url, _qr_data_url] = useState("");

  if (typeof data == "object") data = JC(data);

  const render_options = {
    errorCorrectionLevel: "H",
    color: {
      dark: "#FFFFFF5F",
      light: "#FFFFFF00",
    },
  };

  QRCode.toDataURL(data, render_options, (err, url) => _qr_data_url(url));

  return html` <img class="qr-h" src=${qr_data_url} /> `;
}

export function EMFlasher(em_on_, duration) {
  return () => {
    const is_enabled =
      duration == true || (typeof duration == "number" && duration > 0);
    if (!is_enabled) return null;

    const EM_FLASH_DELAY = 750;

    let em_on = true;
    const em_flasher = setInterval(
      () => em_on_((em_on = !em_on)),
      EM_FLASH_DELAY
    );
    const em_timer =
      duration === true
        ? null
        : setTimeout(() => {
            clearInterval(em_flasher);
            em_on_(false);
          }, duration);

    return () => {
      clearInterval(em_flasher);
      if (!!em_timer) clearTimeout(em_timer);
    };
  };
}

export function LegInstSingle({ ident, em = false, picto = null }) {
  const [em_on, em_on_] = useState(false);

  useEffect(EMFlasher(em_on_, em), [em]);

  const ident_div = html`
    <div class="ident">
      <${Identicon} ident=${ident} />
    </div>
  `;

  const em_class = em_on ? " em" : "";

  if (Array.isArray(picto)) {
    picto = picto[0];
  }

  const picto_div = !!!picto
    ? null
    : html`
        <div class="picto">
          <${Picto} name=${picto} />
        </div>
      `;

  return html` <div class="leg-inst single${em_class}">
    ${ident_div} ${picto_div}
  </div>`;
}

export function LegInstThreePart({ ident, em = false, pictos = null, texts = null }) {
  const [em_on, em_on_] = useState(false);

  useEffect(EMFlasher(em_on_, em), [em]);

  const ident_div = html`
    <div class="ident">
      <${Identicon} ident=${ident} />
    </div>
  `;

  const em_class = em_on ? " em" : "";

  pictos = typeof pictos === "string" ? [pictos] : pictos;
  const picto_div = !!!pictos
    ? null
    : html`
        <div class="picto">
          ${pictos.map((name) => html` <${Picto} name=${name} /> `)}
        </div>
      `;

  texts = typeof texts === "string" ? [texts] : texts;
  const text_div = !!!texts
    ? null
    : html`
        <div class="text">${texts.map((text) => html` <p>${text}</p> `)}</div>
      `;

  return html`
    <div class="leg-inst three-part${em_class}">
      ${ident_div} ${picto_div} ${text_div}
    </div>
  `;
}

export function LegArrow({ arrow_names }) {
  arrow_names = typeof arrow_names === "string" ? [arrow_names] : arrow_names;
  return !!!arrow_names
    ? null
    : html`
        <div class="leg-arrow">
          ${arrow_names.map((name) => html`<${Picto} name=${name} />`)}
        </div>
      `;
}

export function LegInsts({ children, stack_dir = null }) {
  const stack_class = typeof stack_dir === "string" ? ` ${stack_dir}` : "";

  return html` <div class="leg-insts${stack_class}">${children}</div> `;
}

export function LegRow({ children, stack_dir = "left" }) {
  const stack_class = typeof stack_dir === "string" ? ` ${stack_dir}` : "";

  return html` <div class="leg-row${stack_class}">${children}</div> `;
}

export function Case({children, sid, location = null}) {
  const qr_prefix = "https://pathserver.tomnotch.top/?id="
  const inst_div = html`
  <div class="inst">
    <p>Scan to start navigating or show missing icon</p>
  </div>
  `;

  const qr_data = `${qr_prefix}${sid}`;
  const qr_div = html`
    <div class="qr-h">
      <${QR} data=${qr_data} />
    </div>`;
  

  if (Array.isArray(location)) location.forEach((side) => (typeof(side) == "string") ? [side, ] : side);
  else if (typeof(location) == "string") location = [[], [location, ]];
  else pass;


  const left_location_div = (!!!location || !!!location[0]) ? null : html`
    <div class="left">
      ${location[0].map((v) => html`<p>${v}</p>`)}
    </div>
  `;

  const right_location_div = (!!!location || !!!location[1]) ? null : html`
    <div class="right">
      ${location[1].map((v) => html`<p>${v}</p>`)}
    </div>
  `;

  const location_div = html`
  <div class="location">
    ${left_location_div}
    ${right_location_div}
  </div>
  `;

  return html`
    <div class="casing-container">
      <div class="casing-header">
        <img class="lh-logo" />
        <p>${sid}</p>
      </div>

      ${children}

      <div class="casing-footer">
        ${inst_div}
        ${qr_div}
        ${location_div}
      </div>
    </div>
  `;
}