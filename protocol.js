/*
{"to": "Signage1", "type": "ORDER_ADD", ident: "HKA157", next_direction: 270, icon: ["fa-arrow", ...], text: ["4/F", "via Lift 22"], shown: true || 12378915833}
{"to": "Signage1", "type": "ORDER_MODIFY", ident: "HKA157", ...ORDER_ADD}
{"to": "Signage1", "type": "ORDER_END", ident: "HKA157",}
*/

import htm from 'https://cdn.skypack.dev/htm';
import { h } from 'https://cdn.skypack.dev/preact';
import 'https://cdn.skypack.dev/preact/debug';
const html = htm.bind(h);

import { bearings_to_legs, cls_classmethod, cls_init_self, cls_instance_method, cls_property, JC, JP, now } from "./global_snippets.js";
import { LegInstSingle, LegInstThreePart } from "./sign_literals.js";

export async function n4j_run(cypher, params = null) {
  const uri = "neo4j://pathserver.tomnotch.top:7687";
  const username = "neo4j"; const password = "pathserver";
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const session = driver.session();

  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => record.toObject());
  } 
  
  finally {
    await session.close();
    await driver.close();
  }
}

export async function fetch_junction_legs(sid) {
  const GET_JUNCTION_DIRS_CYPHER = 'MATCH (n:junction {id: $sid})-[m]->() RETURN DISTINCT m.absoluteDirection';
  let junction_legs = (await n4j_run(GET_JUNCTION_DIRS_CYPHER, {sid: Math.floor(sid)}));
  
  junction_legs = junction_legs.map((result) => result["m.absoluteDirection"].toNumber());
  if (junction_legs.length <= 0) return null;

  let out_dirs = bearings_to_legs(junction_legs).sort();

  return {legs: out_dirs};
}

export function Order(...args) {
  let self = cls_init_self(args, Order);

  cls_instance_method(self)(
  function __init__(self, ident, next_direction, shown = true, em = false, pictos = null, texts = null) {
    [self.ident, self.next_direction, self.shown, self.em] = [ident, next_direction, shown, em];
    [self.pictos, self.texts] = [pictos, texts];
    self.is_three_part = (Array.isArray(pictos) || texts !== null);
  });

  cls_instance_method(self)(
  function merge_attr(self, other) {
    for (let key of Object.keys(other)) {
        if (typeof(other[key]) === "function") continue;
        self[key] = other[key];
    }
  });

  cls_instance_method(self)(
  function merge(self, other) {
      self.merge_attr(other);
  });

  cls_instance_method(self)(
  function get_json_order(self, order_type) {
    const order_object = {
      type: order_type,
      ident: self.ident, next_direction: self.next_direction,
      shown: self.shown, em: self.em,
      pictos: self.pictos, texts: self.texts,
    }

    return JC(order_object);
  });

  cls_property(self)(
  function priority(self) {
    // Lower = Higher priority, Maximum 3000
    if (self.shown < now()) return 3200;
    const time_penalty = Math.ceil(1000 / Math.max(1, self.shown - now()));
    const em_penalty = (self.em === true || self.em < now()) ? 0 : 1000;
    const single_penalty = (self.is_three_part) ? 0 : 500;
    
    return time_penalty + em_penalty + single_penalty;
  }
  );

  cls_instance_method(self)(
  function get_leg_inst(self, force_single = false, em = undefined) {
    const is_single = (force_single || !self.is_three_part);
    const is_shown = (self.shown === true) || (self.shown > now());

    const em_time = (typeof(em || self.em) === "number") ? 
        ((em || self.em) - now()) > 0 ? (Math.floor((em || self.em) - now()) * 1000) : false :
      (em || self.em);

    if (!is_shown) return null;

    if (is_single) {
      return html`
        <${LegInstSingle} ident=${self.ident} em=${em_time} picto=${self.pictos} />
      `;
    }
    else {
      return html`
        <${LegInstThreePart} ident=${self.ident} em=${em_time} pictos=${self.pictos} texts=${self.texts} />
      `;
    }
  });
  
  return self;
}

export function OrderQueue(...args) {
  let self = cls_init_self(args, OrderQueue);

  cls_instance_method(self)(
  function __init__(self, orders = null) {
    self.orders = orders || [];
  });


  cls_instance_method(self)(
  function get_order_by_ident(self, ident) {
    if (!!!ident) return null;

    for (let i = 0; i < self.orders.length; i++) {
      if (self.orders[i].ident === ident) {
        return {index: i, order: self.orders[i]};
      }
    }
    return null;
  });

  cls_instance_method(self)(
  function remove_order_by_ident(self, ident) {
    const order = self.get_order_by_ident(ident);
    if (order === null) return false;
    self.orders.splice(order.index, 1);
    return true;
  }
  );

  cls_instance_method(self)(
  function sort_orders(self) {
    self.orders = self.orders.filter((order) => order.priority <= 3000);
    self.orders.sort((a, b) => a.priority - b.priority);
  });

  cls_instance_method(self)(
  function get_leg_orders(self, page = 1, of_page = 1,
    max_legs = 3, max_three_parts = 3, max_singles = 6) {
    self.sort_orders();
    
    const page_length = Math.ceil(self.orders.length / of_page);
    const page_order_last = Math.min(page * page_length, self.orders.length);
    const page_orders = self.orders.slice(page_order_last - page_length, page_length);

    let leg_orders = {}; // {1: {three_parts: [], singles: [],}}

    for (let order of page_orders) {
      const order_leg = bearings_to_legs(order.next_direction);
      const quota_legs = max_legs - Object.keys(leg_orders).length;

      if (leg_orders[order_leg] === undefined) {
        if (quota_legs <= 0) continue;
        leg_orders[order_leg] = {three_parts: [], singles: [], full: false, }
      }

      const quota_three_parts = max_three_parts - leg_orders[order_leg].three_parts.length;
      const quota_singles = max_singles - leg_orders[order_leg].singles.length;

      if (quota_three_parts > 0 && order.is_three_part) {
        leg_orders[order_leg].three_parts.push(order);
      }
      else if (quota_singles > 0 || order.is_single) {
        leg_orders[order_leg].singles.push(order);
      }
      else if (quota_three_parts + quota_singles <= 0) {
        leg_orders[order_leg].full = true;
        continue;
      }
      else {
        pass;
      }
    }

    return leg_orders;
  });

  cls_instance_method(self)(
  function apply_command(self, json) {
    /* 
    Command Structures:
    {"to": "Signage1", "type": "ORDER_ADD", ident: "HKA157", next_direction: 270, 
    icon: ["fa-arrow", ...], text: ["4/F", "via Lift 22"], em: true || 12378915833, shown: true || 12378915833}
    {"to": "Signage1", "type": "ORDER_MODIFY", ident: "HKA157", ...ORDER_ADD}
    {"to": "Signage1", "type": "ORDER_END", ident: "HKA157",}
    */
    if (typeof(json) === "string") json = JP(json);

    if (json.type === "ORDER_ADD") {
      const {ident, next_direction} = json;
      if ((ident || next_direction) === undefined) return false;

      const {shown = true, em = false, icon: pictos = null, text: texts = null} = json;

      const new_order = Order(ident, next_direction, shown, em, pictos, texts);
      const existing_order = self.get_order_by_ident(ident);
      if (existing_order !== null) {
        existing_order.order.merge(new_order);
      }
      else {
        self.orders.push(new_order);
      }

      return new_order;
    }

    else if (json.type === "ORDER_MODIFY") {
      const {ident} = json;

      const old_order = self.get_order_by_ident(ident);
      if (old_order === null) return false;
      
      const {order, index} = old_order;
      order.merge(json);

      return order;
    }

    else if (json.type === "ORDER_END") {
      const {ident} = json;
      return self.remove_order_by_ident(ident);
    }

    else {
      return false;
    }
  });

  return self;
}

export function ConnectionHandler(...args) {
  let self = cls_init_self(args, ConnectionHandler);

  const MAX_RETRIES = cls_classmethod(self, "MAX_RETRIES")(3);

  cls_instance_method(self)(function __init__(
    self,
    address,
    sid,
    ws_open_handler = null,
    ws_inop_handler = null
  ) {
    [self.address, self.sid] = [address, sid];
    self.ws = null;
    self.listeners = [];
    self.retries = 0;
    [self.ws_open_handler, self.ws_inop_handler] = [
      ws_open_handler,
      ws_inop_handler,
    ];
  });

  cls_instance_method(self)(function send(self, message) {
    console.log("WS-OUT", self, message);

    if (self.ws === null) return false;
    if (typeof message == "object") message = JC(message);
    self.ws.send(message);

    return true;
  });

  cls_instance_method(self)(function receive(self, message) {
    console.log("WS-IN", self, message);

    let message_type;

    try {
      message = JP(message);
      message_type = message.type;
    } catch (e) {
      message_type = undefined;
    }

    if (!!message.to && message.to != self.sid) {
      return false;
    }

    const message_pack = message;

    for (let [listener, types_listening] of self.listeners) {
      if (types_listening === true || types_listening.includes(message_type)) {
        listener(message_pack);
      }
    }

    return message_pack;
  });

  cls_instance_method(self)(function notify(self, f, types_listening = true) {
    self.listeners.push([f, types_listening]);
  });

  cls_instance_method(self)(function on_ws_open(self, _) {
    if (!!self.ws_open_handler) {
      const open_message = self.ws_open_handler(self);
      if (!!open_message) self.send(open_message);
    }
  });

  cls_instance_method(self)(function on_ws_message(self, message_event) {
    return self.receive(message_event.data);
  });

  cls_instance_method(self)(function on_ws_inop(self) {
    if (self.ws_inop_handler !== null) self.ws_inop_handler(self);
  });

  cls_instance_method(self)(function start(self, _) {
    if ((self.retries = self.retries + 1) > MAX_RETRIES) {
      self.on_ws_inop();
      return false;
    }
    self.ws = new WebSocket(self.address);
    self.ws.onopen = self.on_ws_open;
    self.ws.onmessage = self.on_ws_message;
    self.ws.onerror = self.start;
  });

  return self;
}