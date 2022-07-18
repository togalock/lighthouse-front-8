import htm from 'https://cdn.skypack.dev/htm';
import { h, render } from 'https://cdn.skypack.dev/preact';
import 'https://cdn.skypack.dev/preact/debug';
import { useEffect, useState } from 'https://cdn.skypack.dev/preact/hooks';
const html = htm.bind(h);

import { cls_classmethod, get_leg_box_dirs, GLOBAL, now, __GET } from "../global_snippets.js";

import { ConnectionHandler, Order, OrderQueue as _OrderQueue, fetch_junction_legs } from "../protocol.js";
import { Case, LegInsts } from "../sign_literals.js";

function SignLocator({stack_dir}) {
  return html`
    <div class="sign-locator ${stack_dir}">
      <img class="lh-logo" />
    </div>
  `;
}

function LegBox({children, stack_dir = "up"}) {
  return html`
    <div class="leg-box ${stack_dir}">
      ${children}
    </div>
  `;
}

function Leg({children, L, sign_locator = null}) {
  const sign_locator_div = (!!!sign_locator) ? null : 
    html`<${SignLocator} stack_dir=${sign_locator} />`;
  
  return html`
    <div class="leg L${L}">
      ${sign_locator_div}
      ${children}
    </div>
  `
}

function OrderQueue(...args) {
  let self = _OrderQueue(...args);

  cls_classmethod(self)(
  function get_leg_boxes_insts(cls, leg_orders) {
    let leg_boxes_insts = {};
    
    for (let [leg, orders] of Object.entries(leg_orders)) {
      const three_part_divs = orders.three_parts.map((order) => order.get_leg_inst());
      const single_divs = orders.singles.map((order) => order.get_leg_inst(true));

      const three_part_rows = three_part_divs.map(
        (three_part_div) => html`
        <${LegInsts}>
          ${three_part_div}
        </${LegInsts}>
      `);

      const singles_row = (single_divs.length == 0) ? null : 
      html`
        <div class="leg-insts">
          ${single_divs}
        </div>
      `;

      leg_boxes_insts[leg] = [singles_row, ...three_part_rows];
    }

    return leg_boxes_insts;
  });

  return self;
}

function App(props) {
  const sid = __GET()["sid"] || "";
  const has_casing = Boolean(__GET()["case"]) || false;
  let legs = __GET()["legs"] || null; // "025"
  let sign_locator_loc = __GET()["sl"] || null; //"2 up"
  const offset = Math.floor(__GET()["d"]) || 0; // 3
  let location = __GET()["loc"] || null; // LT4__Line 1_Line 2

  const [neo4j_legs, _neo4j_legs] = useState(null);
  useEffect(() => {
    fetch_junction_legs(sid).then((node) => (!!!node) ? null : _neo4j_legs(node.legs));
  }, [sid, ]);

  legs = ((!!!neo4j_legs) ? null : neo4j_legs.join("")) || legs || "";

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

  useEffect(() => {
    ws_handler.start();
    ws_handler.notify(() => _etag(now(true)));
    ws_handler.notify(order_queue.apply_command);
  }, [ws_handler, ]);

  useEffect(() => {
    ws_handler_2.start();
    ws_handler_2.notify(() => _etag(now(true)));
    ws_handler_2.notify(order_queue.apply_command);
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

  GLOBAL(ws_handler.receive, "s"); GLOBAL(ws_handler, "hd");
  GLOBAL(order_queue, "oq");

  location = (!!!location) ? null : location.split("__").map((v) => (v.split("_")));

  legs = (!!!legs) ? [] : legs.split("").map((n) => Math.floor(n));
  const leg_box_dirs = get_leg_box_dirs(legs);

  sign_locator_loc = (!!!sign_locator_loc) ? null : 
    sign_locator_loc.split(" ").map((v, i) => [Number, String][i](v));

  const leg_orders = order_queue.get_leg_orders(1, 1, 8, 2, 4);
  const leg_boxes_insts = order_queue.get_leg_boxes_insts(leg_orders);


  let leg_divs = [];
  for (let [L, stack_dir] of leg_box_dirs) {
    const sign_locator_dir = (!!sign_locator_loc && sign_locator_loc[0] === L) ? sign_locator_loc[1] : null;
    const leg_box_insts = (!!!leg_boxes_insts[L]) ? [] : leg_boxes_insts[L];

    const rendered_L = (8 + L + offset) % 8;
    const leg_div = html`
      <${Leg} L=${rendered_L} sign_locator=${sign_locator_dir}>
        <${LegBox} stack_dir=${stack_dir}>
          ${leg_box_insts}
        </${LegBox}>
      </${Leg}>
    `;

    leg_divs.push(leg_div);
  }

  const shown_container = html`
    <div class="shown-container">${leg_divs}</div>
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