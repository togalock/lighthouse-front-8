import htm from 'https://cdn.skypack.dev/htm';
import { h, render } from 'https://cdn.skypack.dev/preact';
import 'https://cdn.skypack.dev/preact/debug';
import { useEffect, useState } from 'https://cdn.skypack.dev/preact/hooks';
const html = htm.bind(h);

import { cls_classmethod, GLOBAL, now, __GET } from "../global_snippets.js";

import { ConnectionHandler, Order, OrderQueue as _OrderQueue } from "../protocol.js";
import { Case, LegArrow, LegInsts, LegRow, Picto } from "../sign_literals.js";


function OrderQueue(...args) {
  let self = _OrderQueue(...args);

  const leg_repr = cls_classmethod(self, "leg_repr")({
    0: {arrow: "arrow-right", stack_dir: "right"}, 
    1: {arrow: "arrow-right zl2", stack_dir: "right"},
    2: {arrow: "arrow-up", }, 
    3: {arrow: "arrow-left zr2", stack_dir: "left"}, 
    4: {arrow: "arrow-left", stack_dir: "left"}, 
    5: {arrow: "arrow-left zl2", stack_dir: "left"}, 
    6: {arrow: ["arrow-up-long", "arrow-turn-down"], }, 
    7: {arrow: "arrow-right zr2", stack_dir: "right"},
  });

  cls_classmethod(self)(
  function get_leg_orders_rows(cls, leg_orders, offset) {
    const leg_row_divs = [];

    for (let [leg, orders] of Object.entries(leg_orders)) {
      const {arrow = null, stack_dir = null} = leg_repr[(8 + offset + leg) % 8];

      const three_part_divs = orders.three_parts.map((order) => order.get_leg_inst());
      const single_divs = orders.singles.map((order) => order.get_leg_inst(true));
      const full_div = (orders.full) ? html`
        <${LegInsts} stack_dir="v">
          <${Picto} name="ellipsis" />
        </${LegInsts}>
      ` : null;

      const leg_insts_div = html`
        <${LegRow} stack_dir=${stack_dir}>
          <${LegArrow} arrow_names=${arrow} />
            ${(three_part_divs.length > 0) ? 
            html`
              <${LegInsts} stack_dir="v">
                ${three_part_divs}
              </${LegInsts}>
              ` : null}

            ${(single_divs.length > 0) ? 
                html`
                  <${LegInsts} stack_dir="h">
                    ${single_divs}
                  </${LegInsts}>
                `: null}

            ${full_div}
        </${LegRow}>
      `;

      leg_row_divs.push(leg_insts_div);
    }

    return leg_row_divs;
  });
  
  return self;
}

function App(props) {
  const sid = __GET()["sid"] || "";
  const has_casing = Boolean(__GET()["case"]) || false;
  const offset = Math.floor(__GET()["d"]) || 0; // 3
  let location = __GET()["loc"] || null; // LT4__Line 1_Line 2

  const [ws_handler, _ws_handler] = useState(
    ConnectionHandler("ws://localhost:5678", sid, 
    (_) => ({"type": "register_frontend", })));

  const [ws_handler_2, _ws_handler_2] = useState(
    ConnectionHandler("wss://pathserver.tomnotch.top/wss", sid, 
    (self) => ({"type": "register_remote_frontend", "signage_id": self.sid})));
  
  const [ws_handler_3, _ws_handler_3] = useState(
    ConnectionHandler("wss://keina.astgov.space/ws1/", sid));

  const [order_queue, _order_queue] = useState(OrderQueue(null));
  const [_, _etag] = useState(0);

  GLOBAL(ws_handler.receive, "s"); GLOBAL(ws_handler, "hd");
  GLOBAL(ws_handler_3, "s3");
  GLOBAL(order_queue, "oq");

  useEffect(() => {
    ws_handler.start();
    ws_handler.notify(order_queue.apply_command);
    ws_handler.notify(() => _etag(now(true)));
  }, [ws_handler, ]);

  useEffect(() => {
    ws_handler_2.start();
    ws_handler_2.notify(order_queue.apply_command);
    ws_handler_2.notify(() => _etag(now(true)));
  }, [ws_handler_2, ]);

  useEffect(() => {
    ws_handler_3.start();
    ws_handler_3.notify(() => _etag(now(true)));
    ws_handler_3.notify(order_queue.apply_command);
  }, [ws_handler_3, ]);

  useEffect(() => {
    const refresh_timer = setInterval(() => _etag(now()), 60 * 1000);
    return (() => clearInterval(refresh_timer));
  });

  location = (!!!location) ? null : location.split("__").map((v) => (v.split("_")));

  const leg_orders = order_queue.get_leg_orders();
  const leg_rows = order_queue.get_leg_orders_rows(leg_orders, offset);

  const shown_container = html`
    <div class="shown-container">${leg_rows}</div>
  `;

  return (has_casing) ? html`
    <${Case} sid=${sid} location=${location}>${shown_container}</${Case}>` :
    shown_container;
}

function main() {
  const APP = html`<${App} />`;
  const ROOT = document.getElementById("root");
  GLOBAL(now); GLOBAL(Order);
  render(APP, ROOT);
}

main();