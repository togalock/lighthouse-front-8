export const JP = (s) => JSON.parse(s); // JsonParse
export const JC = (o) => JSON.stringify(o); // JsonCreate
export const JCP = (o) => JP(JC(o)); //JsonCoPy
export const pass = null;

export const now = (include_decimals = false) => ((include_decimals) ? Number : Math.floor)(Date.now() / 1000);

export function __GET() {
  let res = {};
  const params = (new URL(document.location)).searchParams;
  for (const [key, value] of params.entries()) {
    res[key] = value;
  }
  return res;
}

export function GLOBAL(object, name = undefined) {
  name = name || object.__name__ || object.name;
  window[name] = object;
}

export function GEBQ(query) { // GetElementByQuery
  const results = [...document.querySelectorAll(query)];
  if (results.length == 1) {
    return results[0];
  }
  return results;
}

export function GEBC(html_string) { // GetElementByCreation
  const new_div = document.createElement('div');
  new_div.innerHTML = html_string.trim();

  return new_div.firstChild;
}

export function cls_init_self(args, f_object, csuper = null) {
  return {
    __static__: args.length == 0, 
    __args__: args, __super__: csuper,
    __class__: f_object, __name__: f_object.name
  };
}

export function cls_instance_method(self) { // Class Function
  if (self.__static__) return (f) => pass;
  return function(f) {
    const f_name = f.name;
    if (f_name == "__init__") return f.call(self, self, ...self.__args__);
    const c_f = (...args) => f.call(self, self, ...args);
    self[f_name] = c_f;
  }
}

export function cls_property(self) { // Class Function - Property
  if (self.__static__) return (f) => pass;
  return function(f) {
    const f_name = f.name;
    Object.defineProperty(self, f_name, {get: () => f.call(self, self)});
  }
}

export function cls_setter(self) { // Class Function - Setter
  if (self.__static__) return (f) => pass;
  return function(f) {
    const f_name = f.name;
    Object.defineProperty(self, f_name, {set: (v) => f.call(self, self, v)});
  }
}

export function cls_classmethod(self, name = undefined) { // Class Function - Static
  return function(object) {
    const f_name = name || object.name;
    const c_f = (typeof(object) == "function") ? 
    (...args) => object.call(self, self, ...args) : object;
    self[f_name] = c_f;
    return object;
  }
}

export function bearings_to_legs(bearings) {
  // [0, 270] => [2, 6]
  if (typeof(bearings) == "number") bearings = [bearings, ];

  let res = [];
  for (let bearing of bearings) {
    res.push((8 - Math.floor(bearing / 45) + 2) % 8);
  }

  if (res.length == 1) return res[0];
  return res;
}

export function legs_to_bearings(legs) {
    // [2, 6] => [0, 270]
    if (typeof(legs) == "number") legs = [legs, ];
    
    let res = [];
    for (let leg of legs) {
      res.push(Math.floor(360 + 90 - leg * 90) % 360);
    }

    if (res.length == 1) return res[0];
    return res;
}

export function get_leg_box_dirs(databox_legs) {
  databox_legs.sort();
  let res = []; // [[1, "down"], [2, "up"]]
  for (let i = 0; i < databox_legs.length; i++) {
    let left_index = (i + databox_legs.length + 1) % databox_legs.length;
    let right_index = (i + databox_legs.length - 1) % databox_legs.length;
    let [l, m, r] = [databox_legs[left_index], databox_legs[i], databox_legs[right_index]];
    let l_dist = Math.min(Math.abs(l - m), 8 - Math.abs(l - m));
    let r_dist = Math.min(Math.abs(m - r), 8 - Math.abs(m - r));
    let best_dir = l_dist >= r_dist ? "up" : "down";
    res.push([databox_legs[i], best_dir]);
  }
  return res;
}

export function useRefresh() {
  const CYCLES = 1000;
  const [etag, _etag] = useState(0);
  const update_etag = () => _etag((etag + 1) % CYCLES);

  return update_etag;
}

export function useCron(f, interval_s) {
  const interval_ms = interval_s * 1000;
  useEffect(() => {
    const cron_timer = setInterval(f, interval_ms);

    return () => {
      clearInterval(cron_timer);
    };
  });
}