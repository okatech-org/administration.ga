(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/i18next/dist/esm/i18next.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "changeLanguage",
    ()=>changeLanguage,
    "createInstance",
    ()=>createInstance,
    "default",
    ()=>instance,
    "dir",
    ()=>dir,
    "exists",
    ()=>exists,
    "getFixedT",
    ()=>getFixedT,
    "hasLoadedNamespace",
    ()=>hasLoadedNamespace,
    "init",
    ()=>init,
    "keyFromSelector",
    ()=>keysFromSelector,
    "loadLanguages",
    ()=>loadLanguages,
    "loadNamespaces",
    ()=>loadNamespaces,
    "loadResources",
    ()=>loadResources,
    "reloadResources",
    ()=>reloadResources,
    "setDefaultNamespace",
    ()=>setDefaultNamespace,
    "t",
    ()=>t,
    "use",
    ()=>use
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const isString = (obj)=>typeof obj === 'string';
const defer = ()=>{
    let res;
    let rej;
    const promise = new Promise((resolve, reject)=>{
        res = resolve;
        rej = reject;
    });
    promise.resolve = res;
    promise.reject = rej;
    return promise;
};
const makeString = (object)=>{
    if (object == null) return '';
    return '' + object;
};
const copy = (a, s, t)=>{
    a.forEach((m)=>{
        if (s[m]) t[m] = s[m];
    });
};
const lastOfPathSeparatorRegExp = /###/g;
const cleanKey = (key)=>key && key.indexOf('###') > -1 ? key.replace(lastOfPathSeparatorRegExp, '.') : key;
const canNotTraverseDeeper = (object)=>!object || isString(object);
const getLastOfPath = (object, path, Empty)=>{
    const stack = !isString(path) ? path : path.split('.');
    let stackIndex = 0;
    while(stackIndex < stack.length - 1){
        if (canNotTraverseDeeper(object)) return {};
        const key = cleanKey(stack[stackIndex]);
        if (!object[key] && Empty) object[key] = new Empty();
        if (Object.prototype.hasOwnProperty.call(object, key)) {
            object = object[key];
        } else {
            object = {};
        }
        ++stackIndex;
    }
    if (canNotTraverseDeeper(object)) return {};
    return {
        obj: object,
        k: cleanKey(stack[stackIndex])
    };
};
const setPath = (object, path, newValue)=>{
    const { obj, k } = getLastOfPath(object, path, Object);
    if (obj !== undefined || path.length === 1) {
        obj[k] = newValue;
        return;
    }
    let e = path[path.length - 1];
    let p = path.slice(0, path.length - 1);
    let last = getLastOfPath(object, p, Object);
    while(last.obj === undefined && p.length){
        e = `${p[p.length - 1]}.${e}`;
        p = p.slice(0, p.length - 1);
        last = getLastOfPath(object, p, Object);
        if (last?.obj && typeof last.obj[`${last.k}.${e}`] !== 'undefined') {
            last.obj = undefined;
        }
    }
    last.obj[`${last.k}.${e}`] = newValue;
};
const pushPath = (object, path, newValue, concat)=>{
    const { obj, k } = getLastOfPath(object, path, Object);
    obj[k] = obj[k] || [];
    obj[k].push(newValue);
};
const getPath = (object, path)=>{
    const { obj, k } = getLastOfPath(object, path);
    if (!obj) return undefined;
    if (!Object.prototype.hasOwnProperty.call(obj, k)) return undefined;
    return obj[k];
};
const getPathWithDefaults = (data, defaultData, key)=>{
    const value = getPath(data, key);
    if (value !== undefined) {
        return value;
    }
    return getPath(defaultData, key);
};
const deepExtend = (target, source, overwrite)=>{
    for(const prop in source){
        if (prop !== '__proto__' && prop !== 'constructor') {
            if (prop in target) {
                if (isString(target[prop]) || target[prop] instanceof String || isString(source[prop]) || source[prop] instanceof String) {
                    if (overwrite) target[prop] = source[prop];
                } else {
                    deepExtend(target[prop], source[prop], overwrite);
                }
            } else {
                target[prop] = source[prop];
            }
        }
    }
    return target;
};
const regexEscape = (str)=>str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
var _entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
};
const escape = (data)=>{
    if (isString(data)) {
        return data.replace(/[&<>"'\/]/g, (s)=>_entityMap[s]);
    }
    return data;
};
class RegExpCache {
    constructor(capacity){
        this.capacity = capacity;
        this.regExpMap = new Map();
        this.regExpQueue = [];
    }
    getRegExp(pattern) {
        const regExpFromCache = this.regExpMap.get(pattern);
        if (regExpFromCache !== undefined) {
            return regExpFromCache;
        }
        const regExpNew = new RegExp(pattern);
        if (this.regExpQueue.length === this.capacity) {
            this.regExpMap.delete(this.regExpQueue.shift());
        }
        this.regExpMap.set(pattern, regExpNew);
        this.regExpQueue.push(pattern);
        return regExpNew;
    }
}
const chars = [
    ' ',
    ',',
    '?',
    '!',
    ';'
];
const looksLikeObjectPathRegExpCache = new RegExpCache(20);
const looksLikeObjectPath = (key, nsSeparator, keySeparator)=>{
    nsSeparator = nsSeparator || '';
    keySeparator = keySeparator || '';
    const possibleChars = chars.filter((c)=>nsSeparator.indexOf(c) < 0 && keySeparator.indexOf(c) < 0);
    if (possibleChars.length === 0) return true;
    const r = looksLikeObjectPathRegExpCache.getRegExp(`(${possibleChars.map((c)=>c === '?' ? '\\?' : c).join('|')})`);
    let matched = !r.test(key);
    if (!matched) {
        const ki = key.indexOf(keySeparator);
        if (ki > 0 && !r.test(key.substring(0, ki))) {
            matched = true;
        }
    }
    return matched;
};
const deepFind = (obj, path, keySeparator = '.')=>{
    if (!obj) return undefined;
    if (obj[path]) {
        if (!Object.prototype.hasOwnProperty.call(obj, path)) return undefined;
        return obj[path];
    }
    const tokens = path.split(keySeparator);
    let current = obj;
    for(let i = 0; i < tokens.length;){
        if (!current || typeof current !== 'object') {
            return undefined;
        }
        let next;
        let nextPath = '';
        for(let j = i; j < tokens.length; ++j){
            if (j !== i) {
                nextPath += keySeparator;
            }
            nextPath += tokens[j];
            next = current[nextPath];
            if (next !== undefined) {
                if ([
                    'string',
                    'number',
                    'boolean'
                ].indexOf(typeof next) > -1 && j < tokens.length - 1) {
                    continue;
                }
                i += j - i + 1;
                break;
            }
        }
        current = next;
    }
    return current;
};
const getCleanedCode = (code)=>code?.replace(/_/g, '-');
const consoleLogger = {
    type: 'logger',
    log (args) {
        this.output('log', args);
    },
    warn (args) {
        this.output('warn', args);
    },
    error (args) {
        this.output('error', args);
    },
    output (type, args) {
        console?.[type]?.apply?.(console, args);
    }
};
class Logger {
    constructor(concreteLogger, options = {}){
        this.init(concreteLogger, options);
    }
    init(concreteLogger, options = {}) {
        this.prefix = options.prefix || 'i18next:';
        this.logger = concreteLogger || consoleLogger;
        this.options = options;
        this.debug = options.debug;
    }
    log(...args) {
        return this.forward(args, 'log', '', true);
    }
    warn(...args) {
        return this.forward(args, 'warn', '', true);
    }
    error(...args) {
        return this.forward(args, 'error', '');
    }
    deprecate(...args) {
        return this.forward(args, 'warn', 'WARNING DEPRECATED: ', true);
    }
    forward(args, lvl, prefix, debugOnly) {
        if (debugOnly && !this.debug) return null;
        if (isString(args[0])) args[0] = `${prefix}${this.prefix} ${args[0]}`;
        return this.logger[lvl](args);
    }
    create(moduleName) {
        return new Logger(this.logger, {
            ...{
                prefix: `${this.prefix}:${moduleName}:`
            },
            ...this.options
        });
    }
    clone(options) {
        options = options || this.options;
        options.prefix = options.prefix || this.prefix;
        return new Logger(this.logger, options);
    }
}
var baseLogger = new Logger();
class EventEmitter {
    constructor(){
        this.observers = {};
    }
    on(events, listener) {
        events.split(' ').forEach((event)=>{
            if (!this.observers[event]) this.observers[event] = new Map();
            const numListeners = this.observers[event].get(listener) || 0;
            this.observers[event].set(listener, numListeners + 1);
        });
        return this;
    }
    off(event, listener) {
        if (!this.observers[event]) return;
        if (!listener) {
            delete this.observers[event];
            return;
        }
        this.observers[event].delete(listener);
    }
    emit(event, ...args) {
        if (this.observers[event]) {
            const cloned = Array.from(this.observers[event].entries());
            cloned.forEach(([observer, numTimesAdded])=>{
                for(let i = 0; i < numTimesAdded; i++){
                    observer(...args);
                }
            });
        }
        if (this.observers['*']) {
            const cloned = Array.from(this.observers['*'].entries());
            cloned.forEach(([observer, numTimesAdded])=>{
                for(let i = 0; i < numTimesAdded; i++){
                    observer.apply(observer, [
                        event,
                        ...args
                    ]);
                }
            });
        }
    }
}
class ResourceStore extends EventEmitter {
    constructor(data, options = {
        ns: [
            'translation'
        ],
        defaultNS: 'translation'
    }){
        super();
        this.data = data || {};
        this.options = options;
        if (this.options.keySeparator === undefined) {
            this.options.keySeparator = '.';
        }
        if (this.options.ignoreJSONStructure === undefined) {
            this.options.ignoreJSONStructure = true;
        }
    }
    addNamespaces(ns) {
        if (this.options.ns.indexOf(ns) < 0) {
            this.options.ns.push(ns);
        }
    }
    removeNamespaces(ns) {
        const index = this.options.ns.indexOf(ns);
        if (index > -1) {
            this.options.ns.splice(index, 1);
        }
    }
    getResource(lng, ns, key, options = {}) {
        const keySeparator = options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;
        const ignoreJSONStructure = options.ignoreJSONStructure !== undefined ? options.ignoreJSONStructure : this.options.ignoreJSONStructure;
        let path;
        if (lng.indexOf('.') > -1) {
            path = lng.split('.');
        } else {
            path = [
                lng,
                ns
            ];
            if (key) {
                if (Array.isArray(key)) {
                    path.push(...key);
                } else if (isString(key) && keySeparator) {
                    path.push(...key.split(keySeparator));
                } else {
                    path.push(key);
                }
            }
        }
        const result = getPath(this.data, path);
        if (!result && !ns && !key && lng.indexOf('.') > -1) {
            lng = path[0];
            ns = path[1];
            key = path.slice(2).join('.');
        }
        if (result || !ignoreJSONStructure || !isString(key)) return result;
        return deepFind(this.data?.[lng]?.[ns], key, keySeparator);
    }
    addResource(lng, ns, key, value, options = {
        silent: false
    }) {
        const keySeparator = options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;
        let path = [
            lng,
            ns
        ];
        if (key) path = path.concat(keySeparator ? key.split(keySeparator) : key);
        if (lng.indexOf('.') > -1) {
            path = lng.split('.');
            value = ns;
            ns = path[1];
        }
        this.addNamespaces(ns);
        setPath(this.data, path, value);
        if (!options.silent) this.emit('added', lng, ns, key, value);
    }
    addResources(lng, ns, resources, options = {
        silent: false
    }) {
        for(const m in resources){
            if (isString(resources[m]) || Array.isArray(resources[m])) this.addResource(lng, ns, m, resources[m], {
                silent: true
            });
        }
        if (!options.silent) this.emit('added', lng, ns, resources);
    }
    addResourceBundle(lng, ns, resources, deep, overwrite, options = {
        silent: false,
        skipCopy: false
    }) {
        let path = [
            lng,
            ns
        ];
        if (lng.indexOf('.') > -1) {
            path = lng.split('.');
            deep = resources;
            resources = ns;
            ns = path[1];
        }
        this.addNamespaces(ns);
        let pack = getPath(this.data, path) || {};
        if (!options.skipCopy) resources = JSON.parse(JSON.stringify(resources));
        if (deep) {
            deepExtend(pack, resources, overwrite);
        } else {
            pack = {
                ...pack,
                ...resources
            };
        }
        setPath(this.data, path, pack);
        if (!options.silent) this.emit('added', lng, ns, resources);
    }
    removeResourceBundle(lng, ns) {
        if (this.hasResourceBundle(lng, ns)) {
            delete this.data[lng][ns];
        }
        this.removeNamespaces(ns);
        this.emit('removed', lng, ns);
    }
    hasResourceBundle(lng, ns) {
        return this.getResource(lng, ns) !== undefined;
    }
    getResourceBundle(lng, ns) {
        if (!ns) ns = this.options.defaultNS;
        return this.getResource(lng, ns);
    }
    getDataByLanguage(lng) {
        return this.data[lng];
    }
    hasLanguageSomeTranslations(lng) {
        const data = this.getDataByLanguage(lng);
        const n = data && Object.keys(data) || [];
        return !!n.find((v)=>data[v] && Object.keys(data[v]).length > 0);
    }
    toJSON() {
        return this.data;
    }
}
var postProcessor = {
    processors: {},
    addPostProcessor (module) {
        this.processors[module.name] = module;
    },
    handle (processors, value, key, options, translator) {
        processors.forEach((processor)=>{
            value = this.processors[processor]?.process(value, key, options, translator) ?? value;
        });
        return value;
    }
};
const PATH_KEY = Symbol('i18next/PATH_KEY');
function createProxy() {
    const state = [];
    const handler = Object.create(null);
    let proxy;
    handler.get = (target, key)=>{
        proxy?.revoke?.();
        if (key === PATH_KEY) return state;
        state.push(key);
        proxy = Proxy.revocable(target, handler);
        return proxy.proxy;
    };
    return Proxy.revocable(Object.create(null), handler).proxy;
}
function keysFromSelector(selector, opts) {
    const { [PATH_KEY]: path } = selector(createProxy());
    const keySeparator = opts?.keySeparator ?? '.';
    const nsSeparator = opts?.nsSeparator ?? ':';
    if (path.length > 1 && nsSeparator) {
        const ns = opts?.ns;
        const nsArray = Array.isArray(ns) ? ns : null;
        if (nsArray && nsArray.length > 1 && nsArray.slice(1).includes(path[0])) {
            return `${path[0]}${nsSeparator}${path.slice(1).join(keySeparator)}`;
        }
    }
    return path.join(keySeparator);
}
const checkedLoadedFor = {};
const shouldHandleAsObject = (res)=>!isString(res) && typeof res !== 'boolean' && typeof res !== 'number';
class Translator extends EventEmitter {
    constructor(services, options = {}){
        super();
        copy([
            'resourceStore',
            'languageUtils',
            'pluralResolver',
            'interpolator',
            'backendConnector',
            'i18nFormat',
            'utils'
        ], services, this);
        this.options = options;
        if (this.options.keySeparator === undefined) {
            this.options.keySeparator = '.';
        }
        this.logger = baseLogger.create('translator');
    }
    changeLanguage(lng) {
        if (lng) this.language = lng;
    }
    exists(key, o = {
        interpolation: {}
    }) {
        const opt = {
            ...o
        };
        if (key == null) return false;
        const resolved = this.resolve(key, opt);
        if (resolved?.res === undefined) return false;
        const isObject = shouldHandleAsObject(resolved.res);
        if (opt.returnObjects === false && isObject) {
            return false;
        }
        return true;
    }
    extractFromKey(key, opt) {
        let nsSeparator = opt.nsSeparator !== undefined ? opt.nsSeparator : this.options.nsSeparator;
        if (nsSeparator === undefined) nsSeparator = ':';
        const keySeparator = opt.keySeparator !== undefined ? opt.keySeparator : this.options.keySeparator;
        let namespaces = opt.ns || this.options.defaultNS || [];
        const wouldCheckForNsInKey = nsSeparator && key.indexOf(nsSeparator) > -1;
        const seemsNaturalLanguage = !this.options.userDefinedKeySeparator && !opt.keySeparator && !this.options.userDefinedNsSeparator && !opt.nsSeparator && !looksLikeObjectPath(key, nsSeparator, keySeparator);
        if (wouldCheckForNsInKey && !seemsNaturalLanguage) {
            const m = key.match(this.interpolator.nestingRegexp);
            if (m && m.length > 0) {
                return {
                    key,
                    namespaces: isString(namespaces) ? [
                        namespaces
                    ] : namespaces
                };
            }
            const parts = key.split(nsSeparator);
            if (nsSeparator !== keySeparator || nsSeparator === keySeparator && this.options.ns.indexOf(parts[0]) > -1) namespaces = parts.shift();
            key = parts.join(keySeparator);
        }
        return {
            key,
            namespaces: isString(namespaces) ? [
                namespaces
            ] : namespaces
        };
    }
    translate(keys, o, lastKey) {
        let opt = typeof o === 'object' ? {
            ...o
        } : o;
        if (typeof opt !== 'object' && this.options.overloadTranslationOptionHandler) {
            opt = this.options.overloadTranslationOptionHandler(arguments);
        }
        if (typeof opt === 'object') opt = {
            ...opt
        };
        if (!opt) opt = {};
        if (keys == null) return '';
        if (typeof keys === 'function') keys = keysFromSelector(keys, {
            ...this.options,
            ...opt
        });
        if (!Array.isArray(keys)) keys = [
            String(keys)
        ];
        keys = keys.map((k)=>typeof k === 'function' ? keysFromSelector(k, {
                ...this.options,
                ...opt
            }) : String(k));
        const returnDetails = opt.returnDetails !== undefined ? opt.returnDetails : this.options.returnDetails;
        const keySeparator = opt.keySeparator !== undefined ? opt.keySeparator : this.options.keySeparator;
        const { key, namespaces } = this.extractFromKey(keys[keys.length - 1], opt);
        const namespace = namespaces[namespaces.length - 1];
        let nsSeparator = opt.nsSeparator !== undefined ? opt.nsSeparator : this.options.nsSeparator;
        if (nsSeparator === undefined) nsSeparator = ':';
        const lng = opt.lng || this.language;
        const appendNamespaceToCIMode = opt.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
        if (lng?.toLowerCase() === 'cimode') {
            if (appendNamespaceToCIMode) {
                if (returnDetails) {
                    return {
                        res: `${namespace}${nsSeparator}${key}`,
                        usedKey: key,
                        exactUsedKey: key,
                        usedLng: lng,
                        usedNS: namespace,
                        usedParams: this.getUsedParamsDetails(opt)
                    };
                }
                return `${namespace}${nsSeparator}${key}`;
            }
            if (returnDetails) {
                return {
                    res: key,
                    usedKey: key,
                    exactUsedKey: key,
                    usedLng: lng,
                    usedNS: namespace,
                    usedParams: this.getUsedParamsDetails(opt)
                };
            }
            return key;
        }
        const resolved = this.resolve(keys, opt);
        let res = resolved?.res;
        const resUsedKey = resolved?.usedKey || key;
        const resExactUsedKey = resolved?.exactUsedKey || key;
        const noObject = [
            '[object Number]',
            '[object Function]',
            '[object RegExp]'
        ];
        const joinArrays = opt.joinArrays !== undefined ? opt.joinArrays : this.options.joinArrays;
        const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
        const needsPluralHandling = opt.count !== undefined && !isString(opt.count);
        const hasDefaultValue = Translator.hasDefaultValue(opt);
        const defaultValueSuffix = needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, opt) : '';
        const defaultValueSuffixOrdinalFallback = opt.ordinal && needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, {
            ordinal: false
        }) : '';
        const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
        const defaultValue = needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] || opt[`defaultValue${defaultValueSuffix}`] || opt[`defaultValue${defaultValueSuffixOrdinalFallback}`] || opt.defaultValue;
        let resForObjHndl = res;
        if (handleAsObjectInI18nFormat && !res && hasDefaultValue) {
            resForObjHndl = defaultValue;
        }
        const handleAsObject = shouldHandleAsObject(resForObjHndl);
        const resType = Object.prototype.toString.apply(resForObjHndl);
        if (handleAsObjectInI18nFormat && resForObjHndl && handleAsObject && noObject.indexOf(resType) < 0 && !(isString(joinArrays) && Array.isArray(resForObjHndl))) {
            if (!opt.returnObjects && !this.options.returnObjects) {
                if (!this.options.returnedObjectHandler) {
                    this.logger.warn('accessing an object - but returnObjects options is not enabled!');
                }
                const r = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(resUsedKey, resForObjHndl, {
                    ...opt,
                    ns: namespaces
                }) : `key '${key} (${this.language})' returned an object instead of string.`;
                if (returnDetails) {
                    resolved.res = r;
                    resolved.usedParams = this.getUsedParamsDetails(opt);
                    return resolved;
                }
                return r;
            }
            if (keySeparator) {
                const resTypeIsArray = Array.isArray(resForObjHndl);
                const copy = resTypeIsArray ? [] : {};
                const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
                for(const m in resForObjHndl){
                    if (Object.prototype.hasOwnProperty.call(resForObjHndl, m)) {
                        const deepKey = `${newKeyToUse}${keySeparator}${m}`;
                        if (hasDefaultValue && !res) {
                            copy[m] = this.translate(deepKey, {
                                ...opt,
                                defaultValue: shouldHandleAsObject(defaultValue) ? defaultValue[m] : undefined,
                                ...{
                                    joinArrays: false,
                                    ns: namespaces
                                }
                            });
                        } else {
                            copy[m] = this.translate(deepKey, {
                                ...opt,
                                ...{
                                    joinArrays: false,
                                    ns: namespaces
                                }
                            });
                        }
                        if (copy[m] === deepKey) copy[m] = resForObjHndl[m];
                    }
                }
                res = copy;
            }
        } else if (handleAsObjectInI18nFormat && isString(joinArrays) && Array.isArray(res)) {
            res = res.join(joinArrays);
            if (res) res = this.extendTranslation(res, keys, opt, lastKey);
        } else {
            let usedDefault = false;
            let usedKey = false;
            if (!this.isValidLookup(res) && hasDefaultValue) {
                usedDefault = true;
                res = defaultValue;
            }
            if (!this.isValidLookup(res)) {
                usedKey = true;
                res = key;
            }
            const missingKeyNoValueFallbackToKey = opt.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
            const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? undefined : res;
            const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
            if (usedKey || usedDefault || updateMissing) {
                this.logger.log(updateMissing ? 'updateKey' : 'missingKey', lng, namespace, key, updateMissing ? defaultValue : res);
                if (keySeparator) {
                    const fk = this.resolve(key, {
                        ...opt,
                        keySeparator: false
                    });
                    if (fk && fk.res) this.logger.warn('Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.');
                }
                let lngs = [];
                const fallbackLngs = this.languageUtils.getFallbackCodes(this.options.fallbackLng, opt.lng || this.language);
                if (this.options.saveMissingTo === 'fallback' && fallbackLngs && fallbackLngs[0]) {
                    for(let i = 0; i < fallbackLngs.length; i++){
                        lngs.push(fallbackLngs[i]);
                    }
                } else if (this.options.saveMissingTo === 'all') {
                    lngs = this.languageUtils.toResolveHierarchy(opt.lng || this.language);
                } else {
                    lngs.push(opt.lng || this.language);
                }
                const send = (l, k, specificDefaultValue)=>{
                    const defaultForMissing = hasDefaultValue && specificDefaultValue !== res ? specificDefaultValue : resForMissing;
                    if (this.options.missingKeyHandler) {
                        this.options.missingKeyHandler(l, namespace, k, defaultForMissing, updateMissing, opt);
                    } else if (this.backendConnector?.saveMissing) {
                        this.backendConnector.saveMissing(l, namespace, k, defaultForMissing, updateMissing, opt);
                    }
                    this.emit('missingKey', l, namespace, k, res);
                };
                if (this.options.saveMissing) {
                    if (this.options.saveMissingPlurals && needsPluralHandling) {
                        lngs.forEach((language)=>{
                            const suffixes = this.pluralResolver.getSuffixes(language, opt);
                            if (needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] && suffixes.indexOf(`${this.options.pluralSeparator}zero`) < 0) {
                                suffixes.push(`${this.options.pluralSeparator}zero`);
                            }
                            suffixes.forEach((suffix)=>{
                                send([
                                    language
                                ], key + suffix, opt[`defaultValue${suffix}`] || defaultValue);
                            });
                        });
                    } else {
                        send(lngs, key, defaultValue);
                    }
                }
            }
            res = this.extendTranslation(res, keys, opt, resolved, lastKey);
            if (usedKey && res === key && this.options.appendNamespaceToMissingKey) {
                res = `${namespace}${nsSeparator}${key}`;
            }
            if ((usedKey || usedDefault) && this.options.parseMissingKeyHandler) {
                res = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${namespace}${nsSeparator}${key}` : key, usedDefault ? res : undefined, opt);
            }
        }
        if (returnDetails) {
            resolved.res = res;
            resolved.usedParams = this.getUsedParamsDetails(opt);
            return resolved;
        }
        return res;
    }
    extendTranslation(res, key, opt, resolved, lastKey) {
        if (this.i18nFormat?.parse) {
            res = this.i18nFormat.parse(res, {
                ...this.options.interpolation.defaultVariables,
                ...opt
            }, opt.lng || this.language || resolved.usedLng, resolved.usedNS, resolved.usedKey, {
                resolved
            });
        } else if (!opt.skipInterpolation) {
            if (opt.interpolation) this.interpolator.init({
                ...opt,
                ...{
                    interpolation: {
                        ...this.options.interpolation,
                        ...opt.interpolation
                    }
                }
            });
            const skipOnVariables = isString(res) && (opt?.interpolation?.skipOnVariables !== undefined ? opt.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
            let nestBef;
            if (skipOnVariables) {
                const nb = res.match(this.interpolator.nestingRegexp);
                nestBef = nb && nb.length;
            }
            let data = opt.replace && !isString(opt.replace) ? opt.replace : opt;
            if (this.options.interpolation.defaultVariables) data = {
                ...this.options.interpolation.defaultVariables,
                ...data
            };
            res = this.interpolator.interpolate(res, data, opt.lng || this.language || resolved.usedLng, opt);
            if (skipOnVariables) {
                const na = res.match(this.interpolator.nestingRegexp);
                const nestAft = na && na.length;
                if (nestBef < nestAft) opt.nest = false;
            }
            if (!opt.lng && resolved && resolved.res) opt.lng = this.language || resolved.usedLng;
            if (opt.nest !== false) res = this.interpolator.nest(res, (...args)=>{
                if (lastKey?.[0] === args[0] && !opt.context) {
                    this.logger.warn(`It seems you are nesting recursively key: ${args[0]} in key: ${key[0]}`);
                    return null;
                }
                return this.translate(...args, key);
            }, opt);
            if (opt.interpolation) this.interpolator.reset();
        }
        const postProcess = opt.postProcess || this.options.postProcess;
        const postProcessorNames = isString(postProcess) ? [
            postProcess
        ] : postProcess;
        if (res != null && postProcessorNames?.length && opt.applyPostProcessor !== false) {
            res = postProcessor.handle(postProcessorNames, res, key, this.options && this.options.postProcessPassResolved ? {
                i18nResolved: {
                    ...resolved,
                    usedParams: this.getUsedParamsDetails(opt)
                },
                ...opt
            } : opt, this);
        }
        return res;
    }
    resolve(keys, opt = {}) {
        let found;
        let usedKey;
        let exactUsedKey;
        let usedLng;
        let usedNS;
        if (isString(keys)) keys = [
            keys
        ];
        if (Array.isArray(keys)) keys = keys.map((k)=>typeof k === 'function' ? keysFromSelector(k, {
                ...this.options,
                ...opt
            }) : k);
        keys.forEach((k)=>{
            if (this.isValidLookup(found)) return;
            const extracted = this.extractFromKey(k, opt);
            const key = extracted.key;
            usedKey = key;
            let namespaces = extracted.namespaces;
            if (this.options.fallbackNS) namespaces = namespaces.concat(this.options.fallbackNS);
            const needsPluralHandling = opt.count !== undefined && !isString(opt.count);
            const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
            const needsContextHandling = opt.context !== undefined && (isString(opt.context) || typeof opt.context === 'number') && opt.context !== '';
            const codes = opt.lngs ? opt.lngs : this.languageUtils.toResolveHierarchy(opt.lng || this.language, opt.fallbackLng);
            namespaces.forEach((ns)=>{
                if (this.isValidLookup(found)) return;
                usedNS = ns;
                if (!checkedLoadedFor[`${codes[0]}-${ns}`] && this.utils?.hasLoadedNamespace && !this.utils?.hasLoadedNamespace(usedNS)) {
                    checkedLoadedFor[`${codes[0]}-${ns}`] = true;
                    this.logger.warn(`key "${usedKey}" for languages "${codes.join(', ')}" won't get resolved as namespace "${usedNS}" was not yet loaded`, 'This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!');
                }
                codes.forEach((code)=>{
                    if (this.isValidLookup(found)) return;
                    usedLng = code;
                    const finalKeys = [
                        key
                    ];
                    if (this.i18nFormat?.addLookupKeys) {
                        this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, opt);
                    } else {
                        let pluralSuffix;
                        if (needsPluralHandling) pluralSuffix = this.pluralResolver.getSuffix(code, opt.count, opt);
                        const zeroSuffix = `${this.options.pluralSeparator}zero`;
                        const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
                        if (needsPluralHandling) {
                            if (opt.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                                finalKeys.push(key + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                            }
                            finalKeys.push(key + pluralSuffix);
                            if (needsZeroSuffixLookup) {
                                finalKeys.push(key + zeroSuffix);
                            }
                        }
                        if (needsContextHandling) {
                            const contextKey = `${key}${this.options.contextSeparator || '_'}${opt.context}`;
                            finalKeys.push(contextKey);
                            if (needsPluralHandling) {
                                if (opt.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                                    finalKeys.push(contextKey + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                                }
                                finalKeys.push(contextKey + pluralSuffix);
                                if (needsZeroSuffixLookup) {
                                    finalKeys.push(contextKey + zeroSuffix);
                                }
                            }
                        }
                    }
                    let possibleKey;
                    while(possibleKey = finalKeys.pop()){
                        if (!this.isValidLookup(found)) {
                            exactUsedKey = possibleKey;
                            found = this.getResource(code, ns, possibleKey, opt);
                        }
                    }
                });
            });
        });
        return {
            res: found,
            usedKey,
            exactUsedKey,
            usedLng,
            usedNS
        };
    }
    isValidLookup(res) {
        return res !== undefined && !(!this.options.returnNull && res === null) && !(!this.options.returnEmptyString && res === '');
    }
    getResource(code, ns, key, options = {}) {
        if (this.i18nFormat?.getResource) return this.i18nFormat.getResource(code, ns, key, options);
        return this.resourceStore.getResource(code, ns, key, options);
    }
    getUsedParamsDetails(options = {}) {
        const optionsKeys = [
            'defaultValue',
            'ordinal',
            'context',
            'replace',
            'lng',
            'lngs',
            'fallbackLng',
            'ns',
            'keySeparator',
            'nsSeparator',
            'returnObjects',
            'returnDetails',
            'joinArrays',
            'postProcess',
            'interpolation'
        ];
        const useOptionsReplaceForData = options.replace && !isString(options.replace);
        let data = useOptionsReplaceForData ? options.replace : options;
        if (useOptionsReplaceForData && typeof options.count !== 'undefined') {
            data.count = options.count;
        }
        if (this.options.interpolation.defaultVariables) {
            data = {
                ...this.options.interpolation.defaultVariables,
                ...data
            };
        }
        if (!useOptionsReplaceForData) {
            data = {
                ...data
            };
            for (const key of optionsKeys){
                delete data[key];
            }
        }
        return data;
    }
    static hasDefaultValue(options) {
        const prefix = 'defaultValue';
        for(const option in options){
            if (Object.prototype.hasOwnProperty.call(options, option) && prefix === option.substring(0, prefix.length) && undefined !== options[option]) {
                return true;
            }
        }
        return false;
    }
}
class LanguageUtil {
    constructor(options){
        this.options = options;
        this.supportedLngs = this.options.supportedLngs || false;
        this.logger = baseLogger.create('languageUtils');
    }
    getScriptPartFromCode(code) {
        code = getCleanedCode(code);
        if (!code || code.indexOf('-') < 0) return null;
        const p = code.split('-');
        if (p.length === 2) return null;
        p.pop();
        if (p[p.length - 1].toLowerCase() === 'x') return null;
        return this.formatLanguageCode(p.join('-'));
    }
    getLanguagePartFromCode(code) {
        code = getCleanedCode(code);
        if (!code || code.indexOf('-') < 0) return code;
        const p = code.split('-');
        return this.formatLanguageCode(p[0]);
    }
    formatLanguageCode(code) {
        if (isString(code) && code.indexOf('-') > -1) {
            let formattedCode;
            try {
                formattedCode = Intl.getCanonicalLocales(code)[0];
            } catch (e) {}
            if (formattedCode && this.options.lowerCaseLng) {
                formattedCode = formattedCode.toLowerCase();
            }
            if (formattedCode) return formattedCode;
            if (this.options.lowerCaseLng) {
                return code.toLowerCase();
            }
            return code;
        }
        return this.options.cleanCode || this.options.lowerCaseLng ? code.toLowerCase() : code;
    }
    isSupportedCode(code) {
        if (this.options.load === 'languageOnly' || this.options.nonExplicitSupportedLngs) {
            code = this.getLanguagePartFromCode(code);
        }
        return !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.indexOf(code) > -1;
    }
    getBestMatchFromCodes(codes) {
        if (!codes) return null;
        let found;
        codes.forEach((code)=>{
            if (found) return;
            const cleanedLng = this.formatLanguageCode(code);
            if (!this.options.supportedLngs || this.isSupportedCode(cleanedLng)) found = cleanedLng;
        });
        if (!found && this.options.supportedLngs) {
            codes.forEach((code)=>{
                if (found) return;
                const lngScOnly = this.getScriptPartFromCode(code);
                if (this.isSupportedCode(lngScOnly)) return found = lngScOnly;
                const lngOnly = this.getLanguagePartFromCode(code);
                if (this.isSupportedCode(lngOnly)) return found = lngOnly;
                found = this.options.supportedLngs.find((supportedLng)=>{
                    if (supportedLng === lngOnly) return supportedLng;
                    if (supportedLng.indexOf('-') < 0 && lngOnly.indexOf('-') < 0) return;
                    if (supportedLng.indexOf('-') > 0 && lngOnly.indexOf('-') < 0 && supportedLng.substring(0, supportedLng.indexOf('-')) === lngOnly) return supportedLng;
                    if (supportedLng.indexOf(lngOnly) === 0 && lngOnly.length > 1) return supportedLng;
                });
            });
        }
        if (!found) found = this.getFallbackCodes(this.options.fallbackLng)[0];
        return found;
    }
    getFallbackCodes(fallbacks, code) {
        if (!fallbacks) return [];
        if (typeof fallbacks === 'function') fallbacks = fallbacks(code);
        if (isString(fallbacks)) fallbacks = [
            fallbacks
        ];
        if (Array.isArray(fallbacks)) return fallbacks;
        if (!code) return fallbacks.default || [];
        let found = fallbacks[code];
        if (!found) found = fallbacks[this.getScriptPartFromCode(code)];
        if (!found) found = fallbacks[this.formatLanguageCode(code)];
        if (!found) found = fallbacks[this.getLanguagePartFromCode(code)];
        if (!found) found = fallbacks.default;
        return found || [];
    }
    toResolveHierarchy(code, fallbackCode) {
        const fallbackCodes = this.getFallbackCodes((fallbackCode === false ? [] : fallbackCode) || this.options.fallbackLng || [], code);
        const codes = [];
        const addCode = (c)=>{
            if (!c) return;
            if (this.isSupportedCode(c)) {
                codes.push(c);
            } else {
                this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`);
            }
        };
        if (isString(code) && (code.indexOf('-') > -1 || code.indexOf('_') > -1)) {
            if (this.options.load !== 'languageOnly') addCode(this.formatLanguageCode(code));
            if (this.options.load !== 'languageOnly' && this.options.load !== 'currentOnly') addCode(this.getScriptPartFromCode(code));
            if (this.options.load !== 'currentOnly') addCode(this.getLanguagePartFromCode(code));
        } else if (isString(code)) {
            addCode(this.formatLanguageCode(code));
        }
        fallbackCodes.forEach((fc)=>{
            if (codes.indexOf(fc) < 0) addCode(this.formatLanguageCode(fc));
        });
        return codes;
    }
}
const suffixesOrder = {
    zero: 0,
    one: 1,
    two: 2,
    few: 3,
    many: 4,
    other: 5
};
const dummyRule = {
    select: (count)=>count === 1 ? 'one' : 'other',
    resolvedOptions: ()=>({
            pluralCategories: [
                'one',
                'other'
            ]
        })
};
class PluralResolver {
    constructor(languageUtils, options = {}){
        this.languageUtils = languageUtils;
        this.options = options;
        this.logger = baseLogger.create('pluralResolver');
        this.pluralRulesCache = {};
    }
    clearCache() {
        this.pluralRulesCache = {};
    }
    getRule(code, options = {}) {
        const cleanedCode = getCleanedCode(code === 'dev' ? 'en' : code);
        const type = options.ordinal ? 'ordinal' : 'cardinal';
        const cacheKey = JSON.stringify({
            cleanedCode,
            type
        });
        if (cacheKey in this.pluralRulesCache) {
            return this.pluralRulesCache[cacheKey];
        }
        let rule;
        try {
            rule = new Intl.PluralRules(cleanedCode, {
                type
            });
        } catch (err) {
            if (typeof Intl === 'undefined') {
                this.logger.error('No Intl support, please use an Intl polyfill!');
                return dummyRule;
            }
            if (!code.match(/-|_/)) return dummyRule;
            const lngPart = this.languageUtils.getLanguagePartFromCode(code);
            rule = this.getRule(lngPart, options);
        }
        this.pluralRulesCache[cacheKey] = rule;
        return rule;
    }
    needsPlural(code, options = {}) {
        let rule = this.getRule(code, options);
        if (!rule) rule = this.getRule('dev', options);
        return rule?.resolvedOptions().pluralCategories.length > 1;
    }
    getPluralFormsOfKey(code, key, options = {}) {
        return this.getSuffixes(code, options).map((suffix)=>`${key}${suffix}`);
    }
    getSuffixes(code, options = {}) {
        let rule = this.getRule(code, options);
        if (!rule) rule = this.getRule('dev', options);
        if (!rule) return [];
        return rule.resolvedOptions().pluralCategories.sort((pluralCategory1, pluralCategory2)=>suffixesOrder[pluralCategory1] - suffixesOrder[pluralCategory2]).map((pluralCategory)=>`${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ''}${pluralCategory}`);
    }
    getSuffix(code, count, options = {}) {
        const rule = this.getRule(code, options);
        if (rule) {
            return `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ''}${rule.select(count)}`;
        }
        this.logger.warn(`no plural rule found for: ${code}`);
        return this.getSuffix('dev', count, options);
    }
}
const deepFindWithDefaults = (data, defaultData, key, keySeparator = '.', ignoreJSONStructure = true)=>{
    let path = getPathWithDefaults(data, defaultData, key);
    if (!path && ignoreJSONStructure && isString(key)) {
        path = deepFind(data, key, keySeparator);
        if (path === undefined) path = deepFind(defaultData, key, keySeparator);
    }
    return path;
};
const regexSafe = (val)=>val.replace(/\$/g, '$$$$');
class Interpolator {
    constructor(options = {}){
        this.logger = baseLogger.create('interpolator');
        this.options = options;
        this.format = options?.interpolation?.format || ((value)=>value);
        this.init(options);
    }
    init(options = {}) {
        if (!options.interpolation) options.interpolation = {
            escapeValue: true
        };
        const { escape: escape$1, escapeValue, useRawValueToEscape, prefix, prefixEscaped, suffix, suffixEscaped, formatSeparator, unescapeSuffix, unescapePrefix, nestingPrefix, nestingPrefixEscaped, nestingSuffix, nestingSuffixEscaped, nestingOptionsSeparator, maxReplaces, alwaysFormat } = options.interpolation;
        this.escape = escape$1 !== undefined ? escape$1 : escape;
        this.escapeValue = escapeValue !== undefined ? escapeValue : true;
        this.useRawValueToEscape = useRawValueToEscape !== undefined ? useRawValueToEscape : false;
        this.prefix = prefix ? regexEscape(prefix) : prefixEscaped || '{{';
        this.suffix = suffix ? regexEscape(suffix) : suffixEscaped || '}}';
        this.formatSeparator = formatSeparator || ',';
        this.unescapePrefix = unescapeSuffix ? '' : unescapePrefix || '-';
        this.unescapeSuffix = this.unescapePrefix ? '' : unescapeSuffix || '';
        this.nestingPrefix = nestingPrefix ? regexEscape(nestingPrefix) : nestingPrefixEscaped || regexEscape('$t(');
        this.nestingSuffix = nestingSuffix ? regexEscape(nestingSuffix) : nestingSuffixEscaped || regexEscape(')');
        this.nestingOptionsSeparator = nestingOptionsSeparator || ',';
        this.maxReplaces = maxReplaces || 1000;
        this.alwaysFormat = alwaysFormat !== undefined ? alwaysFormat : false;
        this.resetRegExp();
    }
    reset() {
        if (this.options) this.init(this.options);
    }
    resetRegExp() {
        const getOrResetRegExp = (existingRegExp, pattern)=>{
            if (existingRegExp?.source === pattern) {
                existingRegExp.lastIndex = 0;
                return existingRegExp;
            }
            return new RegExp(pattern, 'g');
        };
        this.regexp = getOrResetRegExp(this.regexp, `${this.prefix}(.+?)${this.suffix}`);
        this.regexpUnescape = getOrResetRegExp(this.regexpUnescape, `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`);
        this.nestingRegexp = getOrResetRegExp(this.nestingRegexp, `${this.nestingPrefix}((?:[^()"']+|"[^"]*"|'[^']*'|\\((?:[^()]|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`);
    }
    interpolate(str, data, lng, options) {
        let match;
        let value;
        let replaces;
        const defaultData = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};
        const handleFormat = (key)=>{
            if (key.indexOf(this.formatSeparator) < 0) {
                const path = deepFindWithDefaults(data, defaultData, key, this.options.keySeparator, this.options.ignoreJSONStructure);
                return this.alwaysFormat ? this.format(path, undefined, lng, {
                    ...options,
                    ...data,
                    interpolationkey: key
                }) : path;
            }
            const p = key.split(this.formatSeparator);
            const k = p.shift().trim();
            const f = p.join(this.formatSeparator).trim();
            return this.format(deepFindWithDefaults(data, defaultData, k, this.options.keySeparator, this.options.ignoreJSONStructure), f, lng, {
                ...options,
                ...data,
                interpolationkey: k
            });
        };
        this.resetRegExp();
        const missingInterpolationHandler = options?.missingInterpolationHandler || this.options.missingInterpolationHandler;
        const skipOnVariables = options?.interpolation?.skipOnVariables !== undefined ? options.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
        const todos = [
            {
                regex: this.regexpUnescape,
                safeValue: (val)=>regexSafe(val)
            },
            {
                regex: this.regexp,
                safeValue: (val)=>this.escapeValue ? regexSafe(this.escape(val)) : regexSafe(val)
            }
        ];
        todos.forEach((todo)=>{
            replaces = 0;
            while(match = todo.regex.exec(str)){
                const matchedVar = match[1].trim();
                value = handleFormat(matchedVar);
                if (value === undefined) {
                    if (typeof missingInterpolationHandler === 'function') {
                        const temp = missingInterpolationHandler(str, match, options);
                        value = isString(temp) ? temp : '';
                    } else if (options && Object.prototype.hasOwnProperty.call(options, matchedVar)) {
                        value = '';
                    } else if (skipOnVariables) {
                        value = match[0];
                        continue;
                    } else {
                        this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
                        value = '';
                    }
                } else if (!isString(value) && !this.useRawValueToEscape) {
                    value = makeString(value);
                }
                const safeValue = todo.safeValue(value);
                str = str.replace(match[0], safeValue);
                if (skipOnVariables) {
                    todo.regex.lastIndex += value.length;
                    todo.regex.lastIndex -= match[0].length;
                } else {
                    todo.regex.lastIndex = 0;
                }
                replaces++;
                if (replaces >= this.maxReplaces) {
                    break;
                }
            }
        });
        return str;
    }
    nest(str, fc, options = {}) {
        let match;
        let value;
        let clonedOptions;
        const handleHasOptions = (key, inheritedOptions)=>{
            const sep = this.nestingOptionsSeparator;
            if (key.indexOf(sep) < 0) return key;
            const c = key.split(new RegExp(`${regexEscape(sep)}[ ]*{`));
            let optionsString = `{${c[1]}`;
            key = c[0];
            optionsString = this.interpolate(optionsString, clonedOptions);
            const matchedSingleQuotes = optionsString.match(/'/g);
            const matchedDoubleQuotes = optionsString.match(/"/g);
            if ((matchedSingleQuotes?.length ?? 0) % 2 === 0 && !matchedDoubleQuotes || (matchedDoubleQuotes?.length ?? 0) % 2 !== 0) {
                optionsString = optionsString.replace(/'/g, '"');
            }
            try {
                clonedOptions = JSON.parse(optionsString);
                if (inheritedOptions) clonedOptions = {
                    ...inheritedOptions,
                    ...clonedOptions
                };
            } catch (e) {
                this.logger.warn(`failed parsing options string in nesting for key ${key}`, e);
                return `${key}${sep}${optionsString}`;
            }
            if (clonedOptions.defaultValue && clonedOptions.defaultValue.indexOf(this.prefix) > -1) delete clonedOptions.defaultValue;
            return key;
        };
        while(match = this.nestingRegexp.exec(str)){
            let formatters = [];
            clonedOptions = {
                ...options
            };
            clonedOptions = clonedOptions.replace && !isString(clonedOptions.replace) ? clonedOptions.replace : clonedOptions;
            clonedOptions.applyPostProcessor = false;
            delete clonedOptions.defaultValue;
            const keyEndIndex = /{.*}/.test(match[1]) ? match[1].lastIndexOf('}') + 1 : match[1].indexOf(this.formatSeparator);
            if (keyEndIndex !== -1) {
                formatters = match[1].slice(keyEndIndex).split(this.formatSeparator).map((elem)=>elem.trim()).filter(Boolean);
                match[1] = match[1].slice(0, keyEndIndex);
            }
            value = fc(handleHasOptions.call(this, match[1].trim(), clonedOptions), clonedOptions);
            if (value && match[0] === str && !isString(value)) return value;
            if (!isString(value)) value = makeString(value);
            if (!value) {
                this.logger.warn(`missed to resolve ${match[1]} for nesting ${str}`);
                value = '';
            }
            if (formatters.length) {
                value = formatters.reduce((v, f)=>this.format(v, f, options.lng, {
                        ...options,
                        interpolationkey: match[1].trim()
                    }), value.trim());
            }
            str = str.replace(match[0], value);
            this.regexp.lastIndex = 0;
        }
        return str;
    }
}
const parseFormatStr = (formatStr)=>{
    let formatName = formatStr.toLowerCase().trim();
    const formatOptions = {};
    if (formatStr.indexOf('(') > -1) {
        const p = formatStr.split('(');
        formatName = p[0].toLowerCase().trim();
        const optStr = p[1].substring(0, p[1].length - 1);
        if (formatName === 'currency' && optStr.indexOf(':') < 0) {
            if (!formatOptions.currency) formatOptions.currency = optStr.trim();
        } else if (formatName === 'relativetime' && optStr.indexOf(':') < 0) {
            if (!formatOptions.range) formatOptions.range = optStr.trim();
        } else {
            const opts = optStr.split(';');
            opts.forEach((opt)=>{
                if (opt) {
                    const [key, ...rest] = opt.split(':');
                    const val = rest.join(':').trim().replace(/^'+|'+$/g, '');
                    const trimmedKey = key.trim();
                    if (!formatOptions[trimmedKey]) formatOptions[trimmedKey] = val;
                    if (val === 'false') formatOptions[trimmedKey] = false;
                    if (val === 'true') formatOptions[trimmedKey] = true;
                    if (!isNaN(val)) formatOptions[trimmedKey] = parseInt(val, 10);
                }
            });
        }
    }
    return {
        formatName,
        formatOptions
    };
};
const createCachedFormatter = (fn)=>{
    const cache = {};
    return (v, l, o)=>{
        let optForCache = o;
        if (o && o.interpolationkey && o.formatParams && o.formatParams[o.interpolationkey] && o[o.interpolationkey]) {
            optForCache = {
                ...optForCache,
                [o.interpolationkey]: undefined
            };
        }
        const key = l + JSON.stringify(optForCache);
        let frm = cache[key];
        if (!frm) {
            frm = fn(getCleanedCode(l), o);
            cache[key] = frm;
        }
        return frm(v);
    };
};
const createNonCachedFormatter = (fn)=>(v, l, o)=>fn(getCleanedCode(l), o)(v);
class Formatter {
    constructor(options = {}){
        this.logger = baseLogger.create('formatter');
        this.options = options;
        this.init(options);
    }
    init(services, options = {
        interpolation: {}
    }) {
        this.formatSeparator = options.interpolation.formatSeparator || ',';
        const cf = options.cacheInBuiltFormats ? createCachedFormatter : createNonCachedFormatter;
        this.formats = {
            number: cf((lng, opt)=>{
                const formatter = new Intl.NumberFormat(lng, {
                    ...opt
                });
                return (val)=>formatter.format(val);
            }),
            currency: cf((lng, opt)=>{
                const formatter = new Intl.NumberFormat(lng, {
                    ...opt,
                    style: 'currency'
                });
                return (val)=>formatter.format(val);
            }),
            datetime: cf((lng, opt)=>{
                const formatter = new Intl.DateTimeFormat(lng, {
                    ...opt
                });
                return (val)=>formatter.format(val);
            }),
            relativetime: cf((lng, opt)=>{
                const formatter = new Intl.RelativeTimeFormat(lng, {
                    ...opt
                });
                return (val)=>formatter.format(val, opt.range || 'day');
            }),
            list: cf((lng, opt)=>{
                const formatter = new Intl.ListFormat(lng, {
                    ...opt
                });
                return (val)=>formatter.format(val);
            })
        };
    }
    add(name, fc) {
        this.formats[name.toLowerCase().trim()] = fc;
    }
    addCached(name, fc) {
        this.formats[name.toLowerCase().trim()] = createCachedFormatter(fc);
    }
    format(value, format, lng, options = {}) {
        const formats = format.split(this.formatSeparator);
        if (formats.length > 1 && formats[0].indexOf('(') > 1 && formats[0].indexOf(')') < 0 && formats.find((f)=>f.indexOf(')') > -1)) {
            const lastIndex = formats.findIndex((f)=>f.indexOf(')') > -1);
            formats[0] = [
                formats[0],
                ...formats.splice(1, lastIndex)
            ].join(this.formatSeparator);
        }
        const result = formats.reduce((mem, f)=>{
            const { formatName, formatOptions } = parseFormatStr(f);
            if (this.formats[formatName]) {
                let formatted = mem;
                try {
                    const valOptions = options?.formatParams?.[options.interpolationkey] || {};
                    const l = valOptions.locale || valOptions.lng || options.locale || options.lng || lng;
                    formatted = this.formats[formatName](mem, l, {
                        ...formatOptions,
                        ...options,
                        ...valOptions
                    });
                } catch (error) {
                    this.logger.warn(error);
                }
                return formatted;
            } else {
                this.logger.warn(`there was no format function for ${formatName}`);
            }
            return mem;
        }, value);
        return result;
    }
}
const removePending = (q, name)=>{
    if (q.pending[name] !== undefined) {
        delete q.pending[name];
        q.pendingCount--;
    }
};
class Connector extends EventEmitter {
    constructor(backend, store, services, options = {}){
        super();
        this.backend = backend;
        this.store = store;
        this.services = services;
        this.languageUtils = services.languageUtils;
        this.options = options;
        this.logger = baseLogger.create('backendConnector');
        this.waitingReads = [];
        this.maxParallelReads = options.maxParallelReads || 10;
        this.readingCalls = 0;
        this.maxRetries = options.maxRetries >= 0 ? options.maxRetries : 5;
        this.retryTimeout = options.retryTimeout >= 1 ? options.retryTimeout : 350;
        this.state = {};
        this.queue = [];
        this.backend?.init?.(services, options.backend, options);
    }
    queueLoad(languages, namespaces, options, callback) {
        const toLoad = {};
        const pending = {};
        const toLoadLanguages = {};
        const toLoadNamespaces = {};
        languages.forEach((lng)=>{
            let hasAllNamespaces = true;
            namespaces.forEach((ns)=>{
                const name = `${lng}|${ns}`;
                if (!options.reload && this.store.hasResourceBundle(lng, ns)) {
                    this.state[name] = 2;
                } else if (this.state[name] < 0) ;
                else if (this.state[name] === 1) {
                    if (pending[name] === undefined) pending[name] = true;
                } else {
                    this.state[name] = 1;
                    hasAllNamespaces = false;
                    if (pending[name] === undefined) pending[name] = true;
                    if (toLoad[name] === undefined) toLoad[name] = true;
                    if (toLoadNamespaces[ns] === undefined) toLoadNamespaces[ns] = true;
                }
            });
            if (!hasAllNamespaces) toLoadLanguages[lng] = true;
        });
        if (Object.keys(toLoad).length || Object.keys(pending).length) {
            this.queue.push({
                pending,
                pendingCount: Object.keys(pending).length,
                loaded: {},
                errors: [],
                callback
            });
        }
        return {
            toLoad: Object.keys(toLoad),
            pending: Object.keys(pending),
            toLoadLanguages: Object.keys(toLoadLanguages),
            toLoadNamespaces: Object.keys(toLoadNamespaces)
        };
    }
    loaded(name, err, data) {
        const s = name.split('|');
        const lng = s[0];
        const ns = s[1];
        if (err) this.emit('failedLoading', lng, ns, err);
        if (!err && data) {
            this.store.addResourceBundle(lng, ns, data, undefined, undefined, {
                skipCopy: true
            });
        }
        this.state[name] = err ? -1 : 2;
        if (err && data) this.state[name] = 0;
        const loaded = {};
        this.queue.forEach((q)=>{
            pushPath(q.loaded, [
                lng
            ], ns);
            removePending(q, name);
            if (err) q.errors.push(err);
            if (q.pendingCount === 0 && !q.done) {
                Object.keys(q.loaded).forEach((l)=>{
                    if (!loaded[l]) loaded[l] = {};
                    const loadedKeys = q.loaded[l];
                    if (loadedKeys.length) {
                        loadedKeys.forEach((n)=>{
                            if (loaded[l][n] === undefined) loaded[l][n] = true;
                        });
                    }
                });
                q.done = true;
                if (q.errors.length) {
                    q.callback(q.errors);
                } else {
                    q.callback();
                }
            }
        });
        this.emit('loaded', loaded);
        this.queue = this.queue.filter((q)=>!q.done);
    }
    read(lng, ns, fcName, tried = 0, wait = this.retryTimeout, callback) {
        if (!lng.length) return callback(null, {});
        if (this.readingCalls >= this.maxParallelReads) {
            this.waitingReads.push({
                lng,
                ns,
                fcName,
                tried,
                wait,
                callback
            });
            return;
        }
        this.readingCalls++;
        const resolver = (err, data)=>{
            this.readingCalls--;
            if (this.waitingReads.length > 0) {
                const next = this.waitingReads.shift();
                this.read(next.lng, next.ns, next.fcName, next.tried, next.wait, next.callback);
            }
            if (err && data && tried < this.maxRetries) {
                setTimeout(()=>{
                    this.read.call(this, lng, ns, fcName, tried + 1, wait * 2, callback);
                }, wait);
                return;
            }
            callback(err, data);
        };
        const fc = this.backend[fcName].bind(this.backend);
        if (fc.length === 2) {
            try {
                const r = fc(lng, ns);
                if (r && typeof r.then === 'function') {
                    r.then((data)=>resolver(null, data)).catch(resolver);
                } else {
                    resolver(null, r);
                }
            } catch (err) {
                resolver(err);
            }
            return;
        }
        return fc(lng, ns, resolver);
    }
    prepareLoading(languages, namespaces, options = {}, callback) {
        if (!this.backend) {
            this.logger.warn('No backend was added via i18next.use. Will not load resources.');
            return callback && callback();
        }
        if (isString(languages)) languages = this.languageUtils.toResolveHierarchy(languages);
        if (isString(namespaces)) namespaces = [
            namespaces
        ];
        const toLoad = this.queueLoad(languages, namespaces, options, callback);
        if (!toLoad.toLoad.length) {
            if (!toLoad.pending.length) callback();
            return null;
        }
        toLoad.toLoad.forEach((name)=>{
            this.loadOne(name);
        });
    }
    load(languages, namespaces, callback) {
        this.prepareLoading(languages, namespaces, {}, callback);
    }
    reload(languages, namespaces, callback) {
        this.prepareLoading(languages, namespaces, {
            reload: true
        }, callback);
    }
    loadOne(name, prefix = '') {
        const s = name.split('|');
        const lng = s[0];
        const ns = s[1];
        this.read(lng, ns, 'read', undefined, undefined, (err, data)=>{
            if (err) this.logger.warn(`${prefix}loading namespace ${ns} for language ${lng} failed`, err);
            if (!err && data) this.logger.log(`${prefix}loaded namespace ${ns} for language ${lng}`, data);
            this.loaded(name, err, data);
        });
    }
    saveMissing(languages, namespace, key, fallbackValue, isUpdate, options = {}, clb = ()=>{}) {
        if (this.services?.utils?.hasLoadedNamespace && !this.services?.utils?.hasLoadedNamespace(namespace)) {
            this.logger.warn(`did not save key "${key}" as the namespace "${namespace}" was not yet loaded`, 'This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!');
            return;
        }
        if (key === undefined || key === null || key === '') return;
        if (this.backend?.create) {
            const opts = {
                ...options,
                isUpdate
            };
            const fc = this.backend.create.bind(this.backend);
            if (fc.length < 6) {
                try {
                    let r;
                    if (fc.length === 5) {
                        r = fc(languages, namespace, key, fallbackValue, opts);
                    } else {
                        r = fc(languages, namespace, key, fallbackValue);
                    }
                    if (r && typeof r.then === 'function') {
                        r.then((data)=>clb(null, data)).catch(clb);
                    } else {
                        clb(null, r);
                    }
                } catch (err) {
                    clb(err);
                }
            } else {
                fc(languages, namespace, key, fallbackValue, clb, opts);
            }
        }
        if (!languages || !languages[0]) return;
        this.store.addResource(languages[0], namespace, key, fallbackValue);
    }
}
const get = ()=>({
        debug: false,
        initAsync: true,
        ns: [
            'translation'
        ],
        defaultNS: [
            'translation'
        ],
        fallbackLng: [
            'dev'
        ],
        fallbackNS: false,
        supportedLngs: false,
        nonExplicitSupportedLngs: false,
        load: 'all',
        preload: false,
        simplifyPluralSuffix: true,
        keySeparator: '.',
        nsSeparator: ':',
        pluralSeparator: '_',
        contextSeparator: '_',
        partialBundledLanguages: false,
        saveMissing: false,
        updateMissing: false,
        saveMissingTo: 'fallback',
        saveMissingPlurals: true,
        missingKeyHandler: false,
        missingInterpolationHandler: false,
        postProcess: false,
        postProcessPassResolved: false,
        returnNull: false,
        returnEmptyString: true,
        returnObjects: false,
        joinArrays: false,
        returnedObjectHandler: false,
        parseMissingKeyHandler: false,
        appendNamespaceToMissingKey: false,
        appendNamespaceToCIMode: false,
        overloadTranslationOptionHandler: (args)=>{
            let ret = {};
            if (typeof args[1] === 'object') ret = args[1];
            if (isString(args[1])) ret.defaultValue = args[1];
            if (isString(args[2])) ret.tDescription = args[2];
            if (typeof args[2] === 'object' || typeof args[3] === 'object') {
                const options = args[3] || args[2];
                Object.keys(options).forEach((key)=>{
                    ret[key] = options[key];
                });
            }
            return ret;
        },
        interpolation: {
            escapeValue: true,
            format: (value)=>value,
            prefix: '{{',
            suffix: '}}',
            formatSeparator: ',',
            unescapePrefix: '-',
            nestingPrefix: '$t(',
            nestingSuffix: ')',
            nestingOptionsSeparator: ',',
            maxReplaces: 1000,
            skipOnVariables: true
        },
        cacheInBuiltFormats: true
    });
const transformOptions = (options)=>{
    if (isString(options.ns)) options.ns = [
        options.ns
    ];
    if (isString(options.fallbackLng)) options.fallbackLng = [
        options.fallbackLng
    ];
    if (isString(options.fallbackNS)) options.fallbackNS = [
        options.fallbackNS
    ];
    if (options.supportedLngs?.indexOf?.('cimode') < 0) {
        options.supportedLngs = options.supportedLngs.concat([
            'cimode'
        ]);
    }
    if (typeof options.initImmediate === 'boolean') options.initAsync = options.initImmediate;
    return options;
};
const noop = ()=>{};
const bindMemberFunctions = (inst)=>{
    const mems = Object.getOwnPropertyNames(Object.getPrototypeOf(inst));
    mems.forEach((mem)=>{
        if (typeof inst[mem] === 'function') {
            inst[mem] = inst[mem].bind(inst);
        }
    });
};
const SUPPORT_NOTICE_KEY = '__i18next_supportNoticeShown';
const getSupportNoticeShown = ()=>{
    if (typeof globalThis !== 'undefined' && !!globalThis[SUPPORT_NOTICE_KEY]) return true;
    if (typeof __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"] !== 'undefined' && __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env && __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.I18NEXT_NO_SUPPORT_NOTICE) return true;
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return false;
};
const setSupportNoticeShown = ()=>{
    if (typeof globalThis !== 'undefined') globalThis[SUPPORT_NOTICE_KEY] = true;
};
const usesLocize = (inst)=>{
    if (inst?.modules?.backend?.name?.indexOf('Locize') > 0) return true;
    if (inst?.modules?.backend?.constructor?.name?.indexOf('Locize') > 0) return true;
    if (inst?.options?.backend?.backends) {
        if (inst.options.backend.backends.some((b)=>b?.name?.indexOf('Locize') > 0 || b?.constructor?.name?.indexOf('Locize') > 0)) return true;
    }
    if (inst?.options?.backend?.projectId) return true;
    if (inst?.options?.backend?.backendOptions) {
        if (inst.options.backend.backendOptions.some((b)=>b?.projectId)) return true;
    }
    return false;
};
class I18n extends EventEmitter {
    constructor(options = {}, callback){
        super();
        this.options = transformOptions(options);
        this.services = {};
        this.logger = baseLogger;
        this.modules = {
            external: []
        };
        bindMemberFunctions(this);
        if (callback && !this.isInitialized && !options.isClone) {
            if (!this.options.initAsync) {
                this.init(options, callback);
                return this;
            }
            setTimeout(()=>{
                this.init(options, callback);
            }, 0);
        }
    }
    init(options = {}, callback) {
        this.isInitializing = true;
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (options.defaultNS == null && options.ns) {
            if (isString(options.ns)) {
                options.defaultNS = options.ns;
            } else if (options.ns.indexOf('translation') < 0) {
                options.defaultNS = options.ns[0];
            }
        }
        const defOpts = get();
        this.options = {
            ...defOpts,
            ...this.options,
            ...transformOptions(options)
        };
        this.options.interpolation = {
            ...defOpts.interpolation,
            ...this.options.interpolation
        };
        if (options.keySeparator !== undefined) {
            this.options.userDefinedKeySeparator = options.keySeparator;
        }
        if (options.nsSeparator !== undefined) {
            this.options.userDefinedNsSeparator = options.nsSeparator;
        }
        if (typeof this.options.overloadTranslationOptionHandler !== 'function') {
            this.options.overloadTranslationOptionHandler = defOpts.overloadTranslationOptionHandler;
        }
        if (this.options.showSupportNotice !== false && !usesLocize(this) && !getSupportNoticeShown()) {
            if (typeof console !== 'undefined' && typeof console.info !== 'undefined') console.info('🌐 i18next is made possible by our own product, Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙');
            setSupportNoticeShown();
        }
        const createClassOnDemand = (ClassOrObject)=>{
            if (!ClassOrObject) return null;
            if (typeof ClassOrObject === 'function') return new ClassOrObject();
            return ClassOrObject;
        };
        if (!this.options.isClone) {
            if (this.modules.logger) {
                baseLogger.init(createClassOnDemand(this.modules.logger), this.options);
            } else {
                baseLogger.init(null, this.options);
            }
            let formatter;
            if (this.modules.formatter) {
                formatter = this.modules.formatter;
            } else {
                formatter = Formatter;
            }
            const lu = new LanguageUtil(this.options);
            this.store = new ResourceStore(this.options.resources, this.options);
            const s = this.services;
            s.logger = baseLogger;
            s.resourceStore = this.store;
            s.languageUtils = lu;
            s.pluralResolver = new PluralResolver(lu, {
                prepend: this.options.pluralSeparator,
                simplifyPluralSuffix: this.options.simplifyPluralSuffix
            });
            const usingLegacyFormatFunction = this.options.interpolation.format && this.options.interpolation.format !== defOpts.interpolation.format;
            if (usingLegacyFormatFunction) {
                this.logger.deprecate(`init: you are still using the legacy format function, please use the new approach: https://www.i18next.com/translation-function/formatting`);
            }
            if (formatter && (!this.options.interpolation.format || this.options.interpolation.format === defOpts.interpolation.format)) {
                s.formatter = createClassOnDemand(formatter);
                if (s.formatter.init) s.formatter.init(s, this.options);
                this.options.interpolation.format = s.formatter.format.bind(s.formatter);
            }
            s.interpolator = new Interpolator(this.options);
            s.utils = {
                hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
            };
            s.backendConnector = new Connector(createClassOnDemand(this.modules.backend), s.resourceStore, s, this.options);
            s.backendConnector.on('*', (event, ...args)=>{
                this.emit(event, ...args);
            });
            if (this.modules.languageDetector) {
                s.languageDetector = createClassOnDemand(this.modules.languageDetector);
                if (s.languageDetector.init) s.languageDetector.init(s, this.options.detection, this.options);
            }
            if (this.modules.i18nFormat) {
                s.i18nFormat = createClassOnDemand(this.modules.i18nFormat);
                if (s.i18nFormat.init) s.i18nFormat.init(this);
            }
            this.translator = new Translator(this.services, this.options);
            this.translator.on('*', (event, ...args)=>{
                this.emit(event, ...args);
            });
            this.modules.external.forEach((m)=>{
                if (m.init) m.init(this);
            });
        }
        this.format = this.options.interpolation.format;
        if (!callback) callback = noop;
        if (this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
            const codes = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
            if (codes.length > 0 && codes[0] !== 'dev') this.options.lng = codes[0];
        }
        if (!this.services.languageDetector && !this.options.lng) {
            this.logger.warn('init: no languageDetector is used and no lng is defined');
        }
        const storeApi = [
            'getResource',
            'hasResourceBundle',
            'getResourceBundle',
            'getDataByLanguage'
        ];
        storeApi.forEach((fcName)=>{
            this[fcName] = (...args)=>this.store[fcName](...args);
        });
        const storeApiChained = [
            'addResource',
            'addResources',
            'addResourceBundle',
            'removeResourceBundle'
        ];
        storeApiChained.forEach((fcName)=>{
            this[fcName] = (...args)=>{
                this.store[fcName](...args);
                return this;
            };
        });
        const deferred = defer();
        const load = ()=>{
            const finish = (err, t)=>{
                this.isInitializing = false;
                if (this.isInitialized && !this.initializedStoreOnce) this.logger.warn('init: i18next is already initialized. You should call init just once!');
                this.isInitialized = true;
                if (!this.options.isClone) this.logger.log('initialized', this.options);
                this.emit('initialized', this.options);
                deferred.resolve(t);
                callback(err, t);
            };
            if (this.languages && !this.isInitialized) return finish(null, this.t.bind(this));
            this.changeLanguage(this.options.lng, finish);
        };
        if (this.options.resources || !this.options.initAsync) {
            load();
        } else {
            setTimeout(load, 0);
        }
        return deferred;
    }
    loadResources(language, callback = noop) {
        let usedCallback = callback;
        const usedLng = isString(language) ? language : this.language;
        if (typeof language === 'function') usedCallback = language;
        if (!this.options.resources || this.options.partialBundledLanguages) {
            if (usedLng?.toLowerCase() === 'cimode' && (!this.options.preload || this.options.preload.length === 0)) return usedCallback();
            const toLoad = [];
            const append = (lng)=>{
                if (!lng) return;
                if (lng === 'cimode') return;
                const lngs = this.services.languageUtils.toResolveHierarchy(lng);
                lngs.forEach((l)=>{
                    if (l === 'cimode') return;
                    if (toLoad.indexOf(l) < 0) toLoad.push(l);
                });
            };
            if (!usedLng) {
                const fallbacks = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
                fallbacks.forEach((l)=>append(l));
            } else {
                append(usedLng);
            }
            this.options.preload?.forEach?.((l)=>append(l));
            this.services.backendConnector.load(toLoad, this.options.ns, (e)=>{
                if (!e && !this.resolvedLanguage && this.language) this.setResolvedLanguage(this.language);
                usedCallback(e);
            });
        } else {
            usedCallback(null);
        }
    }
    reloadResources(lngs, ns, callback) {
        const deferred = defer();
        if (typeof lngs === 'function') {
            callback = lngs;
            lngs = undefined;
        }
        if (typeof ns === 'function') {
            callback = ns;
            ns = undefined;
        }
        if (!lngs) lngs = this.languages;
        if (!ns) ns = this.options.ns;
        if (!callback) callback = noop;
        this.services.backendConnector.reload(lngs, ns, (err)=>{
            deferred.resolve();
            callback(err);
        });
        return deferred;
    }
    use(module) {
        if (!module) throw new Error('You are passing an undefined module! Please check the object you are passing to i18next.use()');
        if (!module.type) throw new Error('You are passing a wrong module! Please check the object you are passing to i18next.use()');
        if (module.type === 'backend') {
            this.modules.backend = module;
        }
        if (module.type === 'logger' || module.log && module.warn && module.error) {
            this.modules.logger = module;
        }
        if (module.type === 'languageDetector') {
            this.modules.languageDetector = module;
        }
        if (module.type === 'i18nFormat') {
            this.modules.i18nFormat = module;
        }
        if (module.type === 'postProcessor') {
            postProcessor.addPostProcessor(module);
        }
        if (module.type === 'formatter') {
            this.modules.formatter = module;
        }
        if (module.type === '3rdParty') {
            this.modules.external.push(module);
        }
        return this;
    }
    setResolvedLanguage(l) {
        if (!l || !this.languages) return;
        if ([
            'cimode',
            'dev'
        ].indexOf(l) > -1) return;
        for(let li = 0; li < this.languages.length; li++){
            const lngInLngs = this.languages[li];
            if ([
                'cimode',
                'dev'
            ].indexOf(lngInLngs) > -1) continue;
            if (this.store.hasLanguageSomeTranslations(lngInLngs)) {
                this.resolvedLanguage = lngInLngs;
                break;
            }
        }
        if (!this.resolvedLanguage && this.languages.indexOf(l) < 0 && this.store.hasLanguageSomeTranslations(l)) {
            this.resolvedLanguage = l;
            this.languages.unshift(l);
        }
    }
    changeLanguage(lng, callback) {
        this.isLanguageChangingTo = lng;
        const deferred = defer();
        this.emit('languageChanging', lng);
        const setLngProps = (l)=>{
            this.language = l;
            this.languages = this.services.languageUtils.toResolveHierarchy(l);
            this.resolvedLanguage = undefined;
            this.setResolvedLanguage(l);
        };
        const done = (err, l)=>{
            if (l) {
                if (this.isLanguageChangingTo === lng) {
                    setLngProps(l);
                    this.translator.changeLanguage(l);
                    this.isLanguageChangingTo = undefined;
                    this.emit('languageChanged', l);
                    this.logger.log('languageChanged', l);
                }
            } else {
                this.isLanguageChangingTo = undefined;
            }
            deferred.resolve((...args)=>this.t(...args));
            if (callback) callback(err, (...args)=>this.t(...args));
        };
        const setLng = (lngs)=>{
            if (!lng && !lngs && this.services.languageDetector) lngs = [];
            const fl = isString(lngs) ? lngs : lngs && lngs[0];
            const l = this.store.hasLanguageSomeTranslations(fl) ? fl : this.services.languageUtils.getBestMatchFromCodes(isString(lngs) ? [
                lngs
            ] : lngs);
            if (l) {
                if (!this.language) {
                    setLngProps(l);
                }
                if (!this.translator.language) this.translator.changeLanguage(l);
                this.services.languageDetector?.cacheUserLanguage?.(l);
            }
            this.loadResources(l, (err)=>{
                done(err, l);
            });
        };
        if (!lng && this.services.languageDetector && !this.services.languageDetector.async) {
            setLng(this.services.languageDetector.detect());
        } else if (!lng && this.services.languageDetector && this.services.languageDetector.async) {
            if (this.services.languageDetector.detect.length === 0) {
                this.services.languageDetector.detect().then(setLng);
            } else {
                this.services.languageDetector.detect(setLng);
            }
        } else {
            setLng(lng);
        }
        return deferred;
    }
    getFixedT(lng, ns, keyPrefix) {
        const fixedT = (key, opts, ...rest)=>{
            let o;
            if (typeof opts !== 'object') {
                o = this.options.overloadTranslationOptionHandler([
                    key,
                    opts
                ].concat(rest));
            } else {
                o = {
                    ...opts
                };
            }
            o.lng = o.lng || fixedT.lng;
            o.lngs = o.lngs || fixedT.lngs;
            o.ns = o.ns || fixedT.ns;
            if (o.keyPrefix !== '') o.keyPrefix = o.keyPrefix || keyPrefix || fixedT.keyPrefix;
            const selectorOpts = {
                ...this.options,
                ...o
            };
            if (typeof o.keyPrefix === 'function') o.keyPrefix = keysFromSelector(o.keyPrefix, selectorOpts);
            const keySeparator = this.options.keySeparator || '.';
            let resultKey;
            if (o.keyPrefix && Array.isArray(key)) {
                resultKey = key.map((k)=>{
                    if (typeof k === 'function') k = keysFromSelector(k, selectorOpts);
                    return `${o.keyPrefix}${keySeparator}${k}`;
                });
            } else {
                if (typeof key === 'function') key = keysFromSelector(key, selectorOpts);
                resultKey = o.keyPrefix ? `${o.keyPrefix}${keySeparator}${key}` : key;
            }
            return this.t(resultKey, o);
        };
        if (isString(lng)) {
            fixedT.lng = lng;
        } else {
            fixedT.lngs = lng;
        }
        fixedT.ns = ns;
        fixedT.keyPrefix = keyPrefix;
        return fixedT;
    }
    t(...args) {
        return this.translator?.translate(...args);
    }
    exists(...args) {
        return this.translator?.exists(...args);
    }
    setDefaultNamespace(ns) {
        this.options.defaultNS = ns;
    }
    hasLoadedNamespace(ns, options = {}) {
        if (!this.isInitialized) {
            this.logger.warn('hasLoadedNamespace: i18next was not initialized', this.languages);
            return false;
        }
        if (!this.languages || !this.languages.length) {
            this.logger.warn('hasLoadedNamespace: i18n.languages were undefined or empty', this.languages);
            return false;
        }
        const lng = options.lng || this.resolvedLanguage || this.languages[0];
        const fallbackLng = this.options ? this.options.fallbackLng : false;
        const lastLng = this.languages[this.languages.length - 1];
        if (lng.toLowerCase() === 'cimode') return true;
        const loadNotPending = (l, n)=>{
            const loadState = this.services.backendConnector.state[`${l}|${n}`];
            return loadState === -1 || loadState === 0 || loadState === 2;
        };
        if (options.precheck) {
            const preResult = options.precheck(this, loadNotPending);
            if (preResult !== undefined) return preResult;
        }
        if (this.hasResourceBundle(lng, ns)) return true;
        if (!this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages) return true;
        if (loadNotPending(lng, ns) && (!fallbackLng || loadNotPending(lastLng, ns))) return true;
        return false;
    }
    loadNamespaces(ns, callback) {
        const deferred = defer();
        if (!this.options.ns) {
            if (callback) callback();
            return Promise.resolve();
        }
        if (isString(ns)) ns = [
            ns
        ];
        ns.forEach((n)=>{
            if (this.options.ns.indexOf(n) < 0) this.options.ns.push(n);
        });
        this.loadResources((err)=>{
            deferred.resolve();
            if (callback) callback(err);
        });
        return deferred;
    }
    loadLanguages(lngs, callback) {
        const deferred = defer();
        if (isString(lngs)) lngs = [
            lngs
        ];
        const preloaded = this.options.preload || [];
        const newLngs = lngs.filter((lng)=>preloaded.indexOf(lng) < 0 && this.services.languageUtils.isSupportedCode(lng));
        if (!newLngs.length) {
            if (callback) callback();
            return Promise.resolve();
        }
        this.options.preload = preloaded.concat(newLngs);
        this.loadResources((err)=>{
            deferred.resolve();
            if (callback) callback(err);
        });
        return deferred;
    }
    dir(lng) {
        if (!lng) lng = this.resolvedLanguage || (this.languages?.length > 0 ? this.languages[0] : this.language);
        if (!lng) return 'rtl';
        try {
            const l = new Intl.Locale(lng);
            if (l && l.getTextInfo) {
                const ti = l.getTextInfo();
                if (ti && ti.direction) return ti.direction;
            }
        } catch (e) {}
        const rtlLngs = [
            'ar',
            'shu',
            'sqr',
            'ssh',
            'xaa',
            'yhd',
            'yud',
            'aao',
            'abh',
            'abv',
            'acm',
            'acq',
            'acw',
            'acx',
            'acy',
            'adf',
            'ads',
            'aeb',
            'aec',
            'afb',
            'ajp',
            'apc',
            'apd',
            'arb',
            'arq',
            'ars',
            'ary',
            'arz',
            'auz',
            'avl',
            'ayh',
            'ayl',
            'ayn',
            'ayp',
            'bbz',
            'pga',
            'he',
            'iw',
            'ps',
            'pbt',
            'pbu',
            'pst',
            'prp',
            'prd',
            'ug',
            'ur',
            'ydd',
            'yds',
            'yih',
            'ji',
            'yi',
            'hbo',
            'men',
            'xmn',
            'fa',
            'jpr',
            'peo',
            'pes',
            'prs',
            'dv',
            'sam',
            'ckb'
        ];
        const languageUtils = this.services?.languageUtils || new LanguageUtil(get());
        if (lng.toLowerCase().indexOf('-latn') > 1) return 'ltr';
        return rtlLngs.indexOf(languageUtils.getLanguagePartFromCode(lng)) > -1 || lng.toLowerCase().indexOf('-arab') > 1 ? 'rtl' : 'ltr';
    }
    static createInstance(options = {}, callback) {
        const instance = new I18n(options, callback);
        instance.createInstance = I18n.createInstance;
        return instance;
    }
    cloneInstance(options = {}, callback = noop) {
        const forkResourceStore = options.forkResourceStore;
        if (forkResourceStore) delete options.forkResourceStore;
        const mergedOptions = {
            ...this.options,
            ...options,
            ...{
                isClone: true
            }
        };
        const clone = new I18n(mergedOptions);
        if (options.debug !== undefined || options.prefix !== undefined) {
            clone.logger = clone.logger.clone(options);
        }
        const membersToCopy = [
            'store',
            'services',
            'language'
        ];
        membersToCopy.forEach((m)=>{
            clone[m] = this[m];
        });
        clone.services = {
            ...this.services
        };
        clone.services.utils = {
            hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
        };
        if (forkResourceStore) {
            const clonedData = Object.keys(this.store.data).reduce((prev, l)=>{
                prev[l] = {
                    ...this.store.data[l]
                };
                prev[l] = Object.keys(prev[l]).reduce((acc, n)=>{
                    acc[n] = {
                        ...prev[l][n]
                    };
                    return acc;
                }, prev[l]);
                return prev;
            }, {});
            clone.store = new ResourceStore(clonedData, mergedOptions);
            clone.services.resourceStore = clone.store;
        }
        if (options.interpolation) {
            const defOpts = get();
            const mergedInterpolation = {
                ...defOpts.interpolation,
                ...this.options.interpolation,
                ...options.interpolation
            };
            const mergedForInterpolator = {
                ...mergedOptions,
                interpolation: mergedInterpolation
            };
            clone.services.interpolator = new Interpolator(mergedForInterpolator);
        }
        clone.translator = new Translator(clone.services, mergedOptions);
        clone.translator.on('*', (event, ...args)=>{
            clone.emit(event, ...args);
        });
        clone.init(mergedOptions, callback);
        clone.translator.options = mergedOptions;
        clone.translator.backendConnector.services.utils = {
            hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
        };
        return clone;
    }
    toJSON() {
        return {
            options: this.options,
            store: this.store,
            language: this.language,
            languages: this.languages,
            resolvedLanguage: this.resolvedLanguage
        };
    }
}
const instance = I18n.createInstance();
const createInstance = instance.createInstance;
const dir = instance.dir;
const init = instance.init;
const loadResources = instance.loadResources;
const reloadResources = instance.reloadResources;
const use = instance.use;
const changeLanguage = instance.changeLanguage;
const getFixedT = instance.getFixedT;
const t = instance.t;
const exists = instance.exists;
const setDefaultNamespace = instance.setDefaultNamespace;
const hasLoadedNamespace = instance.hasLoadedNamespace;
const loadNamespaces = instance.loadNamespaces;
const loadLanguages = instance.loadLanguages;
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/void-elements/index.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

/**
 * This file automatically generated from `pre-publish.js`.
 * Do not manually edit.
 */ module.exports = {
    "area": true,
    "base": true,
    "br": true,
    "col": true,
    "embed": true,
    "hr": true,
    "img": true,
    "input": true,
    "link": true,
    "meta": true,
    "param": true,
    "source": true,
    "track": true,
    "wbr": true
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/html-parse-stringify/dist/html-parse-stringify.module.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$void$2d$elements$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/void-elements/index.js [app-client] (ecmascript)");
;
var t = /\s([^'"/\s><]+?)[\s/>]|([^\s=]+)=\s?(".*?"|'.*?')/g;
function n(n) {
    var r = {
        type: "tag",
        name: "",
        voidElement: !1,
        attrs: {},
        children: []
    }, i = n.match(/<\/?([^\s]+?)[/\s>]/);
    if (i && (r.name = i[1], (__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$void$2d$elements$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"][i[1]] || "/" === n.charAt(n.length - 2)) && (r.voidElement = !0), r.name.startsWith("!--"))) {
        var s = n.indexOf("--\x3e");
        return {
            type: "comment",
            comment: -1 !== s ? n.slice(4, s) : ""
        };
    }
    for(var a = new RegExp(t), c = null; null !== (c = a.exec(n));)if (c[0].trim()) if (c[1]) {
        var o = c[1].trim(), l = [
            o,
            ""
        ];
        o.indexOf("=") > -1 && (l = o.split("=")), r.attrs[l[0]] = l[1], a.lastIndex--;
    } else c[2] && (r.attrs[c[2]] = c[3].trim().substring(1, c[3].length - 1));
    return r;
}
var r = /<[a-zA-Z0-9\-\!\/](?:"[^"]*"|'[^']*'|[^'">])*>/g, i = /^\s*$/, s = Object.create(null);
function a(e, t) {
    switch(t.type){
        case "text":
            return e + t.content;
        case "tag":
            return e += "<" + t.name + (t.attrs ? function(e) {
                var t = [];
                for(var n in e)t.push(n + '="' + e[n] + '"');
                return t.length ? " " + t.join(" ") : "";
            }(t.attrs) : "") + (t.voidElement ? "/>" : ">"), t.voidElement ? e : e + t.children.reduce(a, "") + "</" + t.name + ">";
        case "comment":
            return e + "\x3c!--" + t.comment + "--\x3e";
    }
}
var c = {
    parse: function(e, t) {
        t || (t = {}), t.components || (t.components = s);
        var a, c = [], o = [], l = -1, m = !1;
        if (0 !== e.indexOf("<")) {
            var u = e.indexOf("<");
            c.push({
                type: "text",
                content: -1 === u ? e : e.substring(0, u)
            });
        }
        return e.replace(r, function(r, s) {
            if (m) {
                if (r !== "</" + a.name + ">") return;
                m = !1;
            }
            var u, f = "/" !== r.charAt(1), h = r.startsWith("\x3c!--"), p = s + r.length, d = e.charAt(p);
            if (h) {
                var v = n(r);
                return l < 0 ? (c.push(v), c) : ((u = o[l]).children.push(v), c);
            }
            if (f && (l++, "tag" === (a = n(r)).type && t.components[a.name] && (a.type = "component", m = !0), a.voidElement || m || !d || "<" === d || a.children.push({
                type: "text",
                content: e.slice(p, e.indexOf("<", p))
            }), 0 === l && c.push(a), (u = o[l - 1]) && u.children.push(a), o[l] = a), (!f || a.voidElement) && (l > -1 && (a.voidElement || a.name === r.slice(2, -1)) && (l--, a = -1 === l ? c : o[l]), !m && "<" !== d && d)) {
                u = -1 === l ? c : o[l].children;
                var x = e.indexOf("<", p), g = e.slice(p, -1 === x ? void 0 : x);
                i.test(g) && (g = " "), (x > -1 && l + u.length >= 0 || " " !== g) && u.push({
                    type: "text",
                    content: g
                });
            }
        }), c;
    },
    stringify: function(e) {
        return e.reduce(function(e, t) {
            return e + a("", t);
        }, "");
    }
};
const __TURBOPACK__default__export__ = c;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/utils.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getDisplayName",
    ()=>getDisplayName,
    "hasLoadedNamespace",
    ()=>hasLoadedNamespace,
    "isObject",
    ()=>isObject,
    "isString",
    ()=>isString,
    "loadLanguages",
    ()=>loadLanguages,
    "loadNamespaces",
    ()=>loadNamespaces,
    "warn",
    ()=>warn,
    "warnOnce",
    ()=>warnOnce
]);
const warn = (i18n, code, msg, rest)=>{
    const args = [
        msg,
        {
            code,
            ...rest || {}
        }
    ];
    if (i18n?.services?.logger?.forward) {
        return i18n.services.logger.forward(args, 'warn', 'react-i18next::', true);
    }
    if (isString(args[0])) args[0] = `react-i18next:: ${args[0]}`;
    if (i18n?.services?.logger?.warn) {
        i18n.services.logger.warn(...args);
    } else if (console?.warn) {
        console.warn(...args);
    }
};
const alreadyWarned = {};
const warnOnce = (i18n, code, msg, rest)=>{
    if (isString(msg) && alreadyWarned[msg]) return;
    if (isString(msg)) alreadyWarned[msg] = new Date();
    warn(i18n, code, msg, rest);
};
const loadedClb = (i18n, cb)=>()=>{
        if (i18n.isInitialized) {
            cb();
        } else {
            const initialized = ()=>{
                setTimeout(()=>{
                    i18n.off('initialized', initialized);
                }, 0);
                cb();
            };
            i18n.on('initialized', initialized);
        }
    };
const loadNamespaces = (i18n, ns, cb)=>{
    i18n.loadNamespaces(ns, loadedClb(i18n, cb));
};
const loadLanguages = (i18n, lng, ns, cb)=>{
    if (isString(ns)) ns = [
        ns
    ];
    if (i18n.options.preload && i18n.options.preload.indexOf(lng) > -1) return loadNamespaces(i18n, ns, cb);
    ns.forEach((n)=>{
        if (i18n.options.ns.indexOf(n) < 0) i18n.options.ns.push(n);
    });
    i18n.loadLanguages(lng, loadedClb(i18n, cb));
};
const hasLoadedNamespace = (ns, i18n, options = {})=>{
    if (!i18n.languages || !i18n.languages.length) {
        warnOnce(i18n, 'NO_LANGUAGES', 'i18n.languages were undefined or empty', {
            languages: i18n.languages
        });
        return true;
    }
    return i18n.hasLoadedNamespace(ns, {
        lng: options.lng,
        precheck: (i18nInstance, loadNotPending)=>{
            if (options.bindI18n && options.bindI18n.indexOf('languageChanging') > -1 && i18nInstance.services.backendConnector.backend && i18nInstance.isLanguageChangingTo && !loadNotPending(i18nInstance.isLanguageChangingTo, ns)) return false;
        }
    });
};
const getDisplayName = (Component)=>Component.displayName || Component.name || (isString(Component) && Component.length > 0 ? Component : 'Unknown');
const isString = (obj)=>typeof obj === 'string';
const isObject = (obj)=>typeof obj === 'object' && obj !== null;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/unescape.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "unescape",
    ()=>unescape
]);
const matchHtmlEntity = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34|nbsp|#160|copy|#169|reg|#174|hellip|#8230|#x2F|#47);/g;
const htmlEntities = {
    '&amp;': '&',
    '&#38;': '&',
    '&lt;': '<',
    '&#60;': '<',
    '&gt;': '>',
    '&#62;': '>',
    '&apos;': "'",
    '&#39;': "'",
    '&quot;': '"',
    '&#34;': '"',
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&copy;': '©',
    '&#169;': '©',
    '&reg;': '®',
    '&#174;': '®',
    '&hellip;': '…',
    '&#8230;': '…',
    '&#x2F;': '/',
    '&#47;': '/'
};
const unescapeHtmlEntity = (m)=>htmlEntities[m];
const unescape = (text)=>text.replace(matchHtmlEntity, unescapeHtmlEntity);
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/defaults.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getDefaults",
    ()=>getDefaults,
    "setDefaults",
    ()=>setDefaults
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$unescape$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/unescape.js [app-client] (ecmascript)");
;
let defaultOptions = {
    bindI18n: 'languageChanged',
    bindI18nStore: '',
    transEmptyNodeValue: '',
    transSupportBasicHtmlNodes: true,
    transWrapTextNodes: '',
    transKeepBasicHtmlNodesFor: [
        'br',
        'strong',
        'i',
        'p'
    ],
    useSuspense: true,
    unescape: __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$unescape$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["unescape"],
    transDefaultProps: undefined
};
const setDefaults = (options = {})=>{
    defaultOptions = {
        ...defaultOptions,
        ...options
    };
};
const getDefaults = ()=>defaultOptions;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getI18n",
    ()=>getI18n,
    "setI18n",
    ()=>setI18n
]);
let i18nInstance;
const setI18n = (instance)=>{
    i18nInstance = instance;
};
const getI18n = ()=>i18nInstance;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/TransWithoutContext.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Trans",
    ()=>Trans,
    "nodesToString",
    ()=>nodesToString
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$i18next$2f$dist$2f$esm$2f$i18next$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/i18next/dist/esm/i18next.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$html$2d$parse$2d$stringify$2f$dist$2f$html$2d$parse$2d$stringify$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/html-parse-stringify/dist/html-parse-stringify.module.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/defaults.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$unescape$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/unescape.js [app-client] (ecmascript)");
;
;
;
;
;
;
;
const hasChildren = (node, checkLength)=>{
    if (!node) return false;
    const base = node.props?.children ?? node.children;
    if (checkLength) return base.length > 0;
    return !!base;
};
const getChildren = (node)=>{
    if (!node) return [];
    const children = node.props?.children ?? node.children;
    return node.props?.i18nIsDynamicList ? getAsArray(children) : children;
};
const hasValidReactChildren = (children)=>Array.isArray(children) && children.every(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidElement"]);
const getAsArray = (data)=>Array.isArray(data) ? data : [
        data
    ];
const mergeProps = (source, target)=>{
    const newTarget = {
        ...target
    };
    newTarget.props = {
        ...target.props,
        ...source.props
    };
    return newTarget;
};
const getValuesFromChildren = (children)=>{
    const values = {};
    if (!children) return values;
    const getData = (childs)=>{
        const childrenArray = getAsArray(childs);
        childrenArray.forEach((child)=>{
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(child)) return;
            if (hasChildren(child)) getData(getChildren(child));
            else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(child) && !(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidElement"])(child)) Object.assign(values, child);
        });
    };
    getData(children);
    return values;
};
const nodesToString = (children, i18nOptions, i18n, i18nKey)=>{
    if (!children) return '';
    let stringNode = '';
    const childrenArray = getAsArray(children);
    const keepArray = i18nOptions?.transSupportBasicHtmlNodes ? i18nOptions.transKeepBasicHtmlNodesFor ?? [] : [];
    childrenArray.forEach((child, childIndex)=>{
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(child)) {
            stringNode += `${child}`;
            return;
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidElement"])(child)) {
            const { props, type } = child;
            const childPropsCount = Object.keys(props).length;
            const shouldKeepChild = keepArray.indexOf(type) > -1;
            const childChildren = props.children;
            if (!childChildren && shouldKeepChild && !childPropsCount) {
                stringNode += `<${type}/>`;
                return;
            }
            if (!childChildren && (!shouldKeepChild || childPropsCount) || props.i18nIsDynamicList) {
                stringNode += `<${childIndex}></${childIndex}>`;
                return;
            }
            if (shouldKeepChild && childPropsCount === 1 && (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(childChildren)) {
                stringNode += `<${type}>${childChildren}</${type}>`;
                return;
            }
            const content = nodesToString(childChildren, i18nOptions, i18n, i18nKey);
            stringNode += `<${childIndex}>${content}</${childIndex}>`;
            return;
        }
        if (child === null) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warn"])(i18n, 'TRANS_NULL_VALUE', `Passed in a null value as child`, {
                i18nKey
            });
            return;
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(child)) {
            const { format, ...clone } = child;
            const keys = Object.keys(clone);
            if (keys.length === 1) {
                const value = format ? `${keys[0]}, ${format}` : keys[0];
                stringNode += `{{${value}}}`;
                return;
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warn"])(i18n, 'TRANS_INVALID_OBJ', `Invalid child - Object should only have keys {{ value, format }} (format is optional).`, {
                i18nKey,
                child
            });
            return;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warn"])(i18n, 'TRANS_INVALID_VAR', `Passed in a variable like {number} - pass variables for interpolation as full objects like {{number}}.`, {
            i18nKey,
            child
        });
    });
    return stringNode;
};
const escapeLiteralLessThan = (str, keepArray = [], knownComponentsMap = {})=>{
    if (!str) return str;
    const knownNames = Object.keys(knownComponentsMap);
    const allValidNames = [
        ...keepArray,
        ...knownNames
    ];
    let result = '';
    let i = 0;
    while(i < str.length){
        if (str[i] === '<') {
            let isValidTag = false;
            const closingMatch = str.slice(i).match(/^<\/(\d+|[a-zA-Z][a-zA-Z0-9_-]*)>/);
            if (closingMatch) {
                const tagName = closingMatch[1];
                if (/^\d+$/.test(tagName) || allValidNames.includes(tagName)) {
                    isValidTag = true;
                    result += closingMatch[0];
                    i += closingMatch[0].length;
                }
            }
            if (!isValidTag) {
                const openingMatch = str.slice(i).match(/^<(\d+|[a-zA-Z][a-zA-Z0-9_-]*)(\s+[\w-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*(\/)?>/);
                if (openingMatch) {
                    const tagName = openingMatch[1];
                    if (/^\d+$/.test(tagName) || allValidNames.includes(tagName)) {
                        isValidTag = true;
                        result += openingMatch[0];
                        i += openingMatch[0].length;
                    }
                }
            }
            if (!isValidTag) {
                result += '&lt;';
                i += 1;
            }
        } else {
            result += str[i];
            i += 1;
        }
    }
    return result;
};
const renderNodes = (children, knownComponentsMap, targetString, i18n, i18nOptions, combinedTOpts, shouldUnescape)=>{
    if (targetString === '') return [];
    const keepArray = i18nOptions.transKeepBasicHtmlNodesFor || [];
    const emptyChildrenButNeedsHandling = targetString && new RegExp(keepArray.map((keep)=>`<${keep}`).join('|')).test(targetString);
    if (!children && !knownComponentsMap && !emptyChildrenButNeedsHandling && !shouldUnescape) return [
        targetString
    ];
    const data = knownComponentsMap ?? {};
    const getData = (childs)=>{
        const childrenArray = getAsArray(childs);
        childrenArray.forEach((child)=>{
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(child)) return;
            if (hasChildren(child)) getData(getChildren(child));
            else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(child) && !(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidElement"])(child)) Object.assign(data, child);
        });
    };
    getData(children);
    const escapedString = escapeLiteralLessThan(targetString, keepArray, data);
    const ast = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$html$2d$parse$2d$stringify$2f$dist$2f$html$2d$parse$2d$stringify$2e$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].parse(`<0>${escapedString}</0>`);
    const opts = {
        ...data,
        ...combinedTOpts
    };
    const renderInner = (child, node, rootReactNode)=>{
        const childs = getChildren(child);
        const mappedChildren = mapAST(childs, node.children, rootReactNode);
        return hasValidReactChildren(childs) && mappedChildren.length === 0 || child.props?.i18nIsDynamicList ? childs : mappedChildren;
    };
    const pushTranslatedJSX = (child, inner, mem, i, isVoid)=>{
        if (child.dummy) {
            child.children = inner;
            mem.push((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneElement"])(child, {
                key: i
            }, isVoid ? undefined : inner));
        } else {
            mem.push(...__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Children"].map([
                child
            ], (c)=>{
                const INTERNAL_DYNAMIC_MARKER = 'data-i18n-is-dynamic-list';
                const override = {
                    key: i,
                    [INTERNAL_DYNAMIC_MARKER]: undefined
                };
                if (c && c.props) {
                    Object.keys(c.props).forEach((k)=>{
                        if (k === 'ref' || k === 'children' || k === 'i18nIsDynamicList' || k === INTERNAL_DYNAMIC_MARKER) return;
                        override[k] = c.props[k];
                    });
                }
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneElement"])(c, override, isVoid ? null : inner);
            }));
        }
    };
    const mapAST = (reactNode, astNode, rootReactNode)=>{
        const reactNodes = getAsArray(reactNode);
        const astNodes = getAsArray(astNode);
        return astNodes.reduce((mem, node, i)=>{
            const translationContent = node.children?.[0]?.content && i18n.services.interpolator.interpolate(node.children[0].content, opts, i18n.language);
            if (node.type === 'tag') {
                let tmp = reactNodes[parseInt(node.name, 10)];
                if (!tmp && knownComponentsMap) tmp = knownComponentsMap[node.name];
                if (rootReactNode.length === 1 && !tmp) tmp = rootReactNode[0][node.name];
                if (!tmp) tmp = {};
                const props = {
                    ...node.attrs
                };
                if (shouldUnescape) {
                    Object.keys(props).forEach((p)=>{
                        const val = props[p];
                        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(val)) {
                            props[p] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$unescape$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["unescape"])(val);
                        }
                    });
                }
                const child = Object.keys(props).length !== 0 ? mergeProps({
                    props
                }, tmp) : tmp;
                const isElement = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidElement"])(child);
                const isValidTranslationWithChildren = isElement && hasChildren(node, true) && !node.voidElement;
                const isEmptyTransWithHTML = emptyChildrenButNeedsHandling && (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(child) && child.dummy && !isElement;
                const isKnownComponent = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(knownComponentsMap) && Object.hasOwnProperty.call(knownComponentsMap, node.name);
                if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(child)) {
                    const value = i18n.services.interpolator.interpolate(child, opts, i18n.language);
                    mem.push(value);
                } else if (hasChildren(child) || isValidTranslationWithChildren) {
                    const inner = renderInner(child, node, rootReactNode);
                    pushTranslatedJSX(child, inner, mem, i);
                } else if (isEmptyTransWithHTML) {
                    const inner = mapAST(reactNodes, node.children, rootReactNode);
                    pushTranslatedJSX(child, inner, mem, i);
                } else if (Number.isNaN(parseFloat(node.name))) {
                    if (isKnownComponent) {
                        const inner = renderInner(child, node, rootReactNode);
                        pushTranslatedJSX(child, inner, mem, i, node.voidElement);
                    } else if (i18nOptions.transSupportBasicHtmlNodes && keepArray.indexOf(node.name) > -1) {
                        if (node.voidElement) {
                            mem.push((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(node.name, {
                                key: `${node.name}-${i}`
                            }));
                        } else {
                            const inner = mapAST(reactNodes, node.children, rootReactNode);
                            mem.push((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(node.name, {
                                key: `${node.name}-${i}`
                            }, inner));
                        }
                    } else if (node.voidElement) {
                        mem.push(`<${node.name} />`);
                    } else {
                        const inner = mapAST(reactNodes, node.children, rootReactNode);
                        mem.push(`<${node.name}>${inner}</${node.name}>`);
                    }
                } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(child) && !isElement) {
                    const content = node.children[0] ? translationContent : null;
                    if (content) mem.push(content);
                } else {
                    pushTranslatedJSX(child, translationContent, mem, i, node.children.length !== 1 || !translationContent);
                }
            } else if (node.type === 'text') {
                const wrapTextNodes = i18nOptions.transWrapTextNodes;
                const unescapeFn = typeof i18nOptions.unescape === 'function' ? i18nOptions.unescape : (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDefaults"])().unescape;
                const content = shouldUnescape ? unescapeFn(i18n.services.interpolator.interpolate(node.content, opts, i18n.language)) : i18n.services.interpolator.interpolate(node.content, opts, i18n.language);
                if (wrapTextNodes) {
                    mem.push((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(wrapTextNodes, {
                        key: `${node.name}-${i}`
                    }, content));
                } else {
                    mem.push(content);
                }
            }
            return mem;
        }, []);
    };
    const result = mapAST([
        {
            dummy: true,
            children: children || []
        }
    ], ast, getAsArray(children || []));
    return getChildren(result[0]);
};
const fixComponentProps = (component, index, translation)=>{
    const componentKey = component.key || index;
    const comp = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cloneElement"])(component, {
        key: componentKey
    });
    if (!comp.props || !comp.props.children || translation.indexOf(`${index}/>`) < 0 && translation.indexOf(`${index} />`) < 0) {
        return comp;
    }
    function Componentized() {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], null, comp);
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(Componentized, {
        key: componentKey
    });
};
const generateArrayComponents = (components, translation)=>components.map((c, index)=>fixComponentProps(c, index, translation));
const generateObjectComponents = (components, translation)=>{
    const componentMap = {};
    Object.keys(components).forEach((c)=>{
        Object.assign(componentMap, {
            [c]: fixComponentProps(components[c], c, translation)
        });
    });
    return componentMap;
};
const generateComponents = (components, translation, i18n, i18nKey)=>{
    if (!components) return null;
    if (Array.isArray(components)) {
        return generateArrayComponents(components, translation);
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(components)) {
        return generateObjectComponents(components, translation);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warnOnce"])(i18n, 'TRANS_INVALID_COMPONENTS', `<Trans /> "components" prop expects an object or array`, {
        i18nKey
    });
    return null;
};
const isComponentsMap = (object)=>{
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(object)) return false;
    if (Array.isArray(object)) return false;
    return Object.keys(object).reduce((acc, key)=>acc && Number.isNaN(Number.parseFloat(key)), true);
};
function Trans({ children, count, parent, i18nKey, context, tOptions = {}, values, defaults, components, ns, i18n: i18nFromProps, t: tFromProps, shouldUnescape, ...additionalProps }) {
    const i18n = i18nFromProps || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getI18n"])();
    if (!i18n) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warnOnce"])(i18n, 'NO_I18NEXT_INSTANCE', `Trans: You need to pass in an i18next instance using i18nextReactModule`, {
            i18nKey
        });
        return children;
    }
    const t = tFromProps || i18n.t.bind(i18n) || ((k)=>k);
    const reactI18nextOptions = {
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDefaults"])(),
        ...i18n.options?.react
    };
    let namespaces = ns || t.ns || i18n.options?.defaultNS;
    namespaces = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(namespaces) ? [
        namespaces
    ] : namespaces || [
        'translation'
    ];
    const { transDefaultProps } = reactI18nextOptions;
    const mergedTOptions = transDefaultProps?.tOptions ? {
        ...transDefaultProps.tOptions,
        ...tOptions
    } : tOptions;
    const mergedShouldUnescape = shouldUnescape ?? transDefaultProps?.shouldUnescape;
    const mergedValues = transDefaultProps?.values ? {
        ...transDefaultProps.values,
        ...values
    } : values;
    const mergedComponents = transDefaultProps?.components ? {
        ...transDefaultProps.components,
        ...components
    } : components;
    const nodeAsString = nodesToString(children, reactI18nextOptions, i18n, i18nKey);
    const defaultValue = defaults || mergedTOptions?.defaultValue || nodeAsString || reactI18nextOptions.transEmptyNodeValue || (typeof i18nKey === 'function' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$i18next$2f$dist$2f$esm$2f$i18next$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["keyFromSelector"])(i18nKey) : i18nKey);
    const { hashTransKey } = reactI18nextOptions;
    const key = i18nKey || (hashTransKey ? hashTransKey(nodeAsString || defaultValue) : nodeAsString || defaultValue);
    if (i18n.options?.interpolation?.defaultVariables) {
        values = mergedValues && Object.keys(mergedValues).length > 0 ? {
            ...mergedValues,
            ...i18n.options.interpolation.defaultVariables
        } : {
            ...i18n.options.interpolation.defaultVariables
        };
    } else {
        values = mergedValues;
    }
    const valuesFromChildren = getValuesFromChildren(children);
    if (valuesFromChildren && typeof valuesFromChildren.count === 'number' && count === undefined) {
        count = valuesFromChildren.count;
    }
    const interpolationOverride = values || count !== undefined && !i18n.options?.interpolation?.alwaysFormat || !children ? mergedTOptions.interpolation : {
        interpolation: {
            ...mergedTOptions.interpolation,
            prefix: '#$?',
            suffix: '?$#'
        }
    };
    const combinedTOpts = {
        ...mergedTOptions,
        context: context || mergedTOptions.context,
        count,
        ...values,
        ...interpolationOverride,
        defaultValue,
        ns: namespaces
    };
    let translation = key ? t(key, combinedTOpts) : defaultValue;
    if (translation === key && defaultValue) translation = defaultValue;
    const generatedComponents = generateComponents(mergedComponents, translation, i18n, i18nKey);
    let indexedChildren = generatedComponents || children;
    let componentsMap = null;
    if (isComponentsMap(generatedComponents)) {
        componentsMap = generatedComponents;
        indexedChildren = children;
    }
    const content = renderNodes(indexedChildren, componentsMap, translation, i18n, reactI18nextOptions, combinedTOpts, mergedShouldUnescape);
    const useAsParent = parent ?? reactI18nextOptions.defaultTransParent;
    return useAsParent ? (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(useAsParent, additionalProps, content) : content;
}
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/initReactI18next.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "initReactI18next",
    ()=>initReactI18next
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/defaults.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)");
;
;
const initReactI18next = {
    type: '3rdParty',
    init (instance) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setDefaults"])(instance.options.react);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setI18n"])(instance);
    }
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/context.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "I18nContext",
    ()=>I18nContext,
    "ReportNamespaces",
    ()=>ReportNamespaces,
    "composeInitialProps",
    ()=>composeInitialProps,
    "getInitialProps",
    ()=>getInitialProps
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/defaults.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$initReactI18next$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/initReactI18next.js [app-client] (ecmascript)");
;
;
;
;
;
const I18nContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])();
class ReportNamespaces {
    constructor(){
        this.usedNamespaces = {};
    }
    addUsedNamespaces(namespaces) {
        namespaces.forEach((ns)=>{
            if (!this.usedNamespaces[ns]) this.usedNamespaces[ns] = true;
        });
    }
    getUsedNamespaces() {
        return Object.keys(this.usedNamespaces);
    }
}
const composeInitialProps = (ForComponent)=>async (ctx)=>{
        const componentsInitialProps = await ForComponent.getInitialProps?.(ctx) ?? {};
        const i18nInitialProps = getInitialProps();
        return {
            ...componentsInitialProps,
            ...i18nInitialProps
        };
    };
const getInitialProps = ()=>{
    const i18n = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getI18n"])();
    if (!i18n) {
        console.warn('react-i18next:: getInitialProps: You will need to pass in an i18next instance by using initReactI18next');
        return {};
    }
    const namespaces = i18n.reportNamespaces?.getUsedNamespaces() ?? [];
    const ret = {};
    const initialI18nStore = {};
    i18n.languages.forEach((l)=>{
        initialI18nStore[l] = {};
        namespaces.forEach((ns)=>{
            initialI18nStore[l][ns] = i18n.getResourceBundle(l, ns) || {};
        });
    });
    ret.initialI18nStore = initialI18nStore;
    ret.initialLanguage = i18n.language;
    return ret;
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/Trans.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Trans",
    ()=>Trans
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$TransWithoutContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/TransWithoutContext.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/context.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)");
;
;
;
;
function Trans({ children, count, parent, i18nKey, context, tOptions = {}, values, defaults, components, ns, i18n: i18nFromProps, t: tFromProps, shouldUnescape, ...additionalProps }) {
    const { i18n: i18nFromContext, defaultNS: defaultNSFromContext } = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["I18nContext"]) || {};
    const i18n = i18nFromProps || i18nFromContext || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getI18n"])();
    const t = tFromProps || i18n?.t.bind(i18n);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$TransWithoutContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trans"])({
        children,
        count,
        parent,
        i18nKey,
        context,
        tOptions,
        values,
        defaults,
        components,
        ns: ns || t?.ns || defaultNSFromContext || i18n?.options?.defaultNS,
        i18n,
        t: tFromProps,
        shouldUnescape,
        ...additionalProps
    });
}
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/htmlEntityDecoder.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decodeHtmlEntities",
    ()=>decodeHtmlEntities
]);
const commonEntities = {
    '&nbsp;': '\u00A0',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '…',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&sbquo;': '\u201A',
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&bdquo;': '\u201E',
    '&dagger;': '†',
    '&Dagger;': '‡',
    '&bull;': '•',
    '&prime;': '′',
    '&Prime;': '″',
    '&lsaquo;': '‹',
    '&rsaquo;': '›',
    '&sect;': '§',
    '&para;': '¶',
    '&middot;': '·',
    '&ensp;': '\u2002',
    '&emsp;': '\u2003',
    '&thinsp;': '\u2009',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢',
    '&curren;': '¤',
    '&times;': '×',
    '&divide;': '÷',
    '&minus;': '−',
    '&plusmn;': '±',
    '&ne;': '≠',
    '&le;': '≤',
    '&ge;': '≥',
    '&asymp;': '≈',
    '&equiv;': '≡',
    '&infin;': '∞',
    '&int;': '∫',
    '&sum;': '∑',
    '&prod;': '∏',
    '&radic;': '√',
    '&part;': '∂',
    '&permil;': '‰',
    '&deg;': '°',
    '&micro;': 'µ',
    '&larr;': '←',
    '&uarr;': '↑',
    '&rarr;': '→',
    '&darr;': '↓',
    '&harr;': '↔',
    '&crarr;': '↵',
    '&lArr;': '⇐',
    '&uArr;': '⇑',
    '&rArr;': '⇒',
    '&dArr;': '⇓',
    '&hArr;': '⇔',
    '&alpha;': 'α',
    '&beta;': 'β',
    '&gamma;': 'γ',
    '&delta;': 'δ',
    '&epsilon;': 'ε',
    '&zeta;': 'ζ',
    '&eta;': 'η',
    '&theta;': 'θ',
    '&iota;': 'ι',
    '&kappa;': 'κ',
    '&lambda;': 'λ',
    '&mu;': 'μ',
    '&nu;': 'ν',
    '&xi;': 'ξ',
    '&omicron;': 'ο',
    '&pi;': 'π',
    '&rho;': 'ρ',
    '&sigma;': 'σ',
    '&tau;': 'τ',
    '&upsilon;': 'υ',
    '&phi;': 'φ',
    '&chi;': 'χ',
    '&psi;': 'ψ',
    '&omega;': 'ω',
    '&Alpha;': 'Α',
    '&Beta;': 'Β',
    '&Gamma;': 'Γ',
    '&Delta;': 'Δ',
    '&Epsilon;': 'Ε',
    '&Zeta;': 'Ζ',
    '&Eta;': 'Η',
    '&Theta;': 'Θ',
    '&Iota;': 'Ι',
    '&Kappa;': 'Κ',
    '&Lambda;': 'Λ',
    '&Mu;': 'Μ',
    '&Nu;': 'Ν',
    '&Xi;': 'Ξ',
    '&Omicron;': 'Ο',
    '&Pi;': 'Π',
    '&Rho;': 'Ρ',
    '&Sigma;': 'Σ',
    '&Tau;': 'Τ',
    '&Upsilon;': 'Υ',
    '&Phi;': 'Φ',
    '&Chi;': 'Χ',
    '&Psi;': 'Ψ',
    '&Omega;': 'Ω',
    '&Agrave;': 'À',
    '&Aacute;': 'Á',
    '&Acirc;': 'Â',
    '&Atilde;': 'Ã',
    '&Auml;': 'Ä',
    '&Aring;': 'Å',
    '&AElig;': 'Æ',
    '&Ccedil;': 'Ç',
    '&Egrave;': 'È',
    '&Eacute;': 'É',
    '&Ecirc;': 'Ê',
    '&Euml;': 'Ë',
    '&Igrave;': 'Ì',
    '&Iacute;': 'Í',
    '&Icirc;': 'Î',
    '&Iuml;': 'Ï',
    '&ETH;': 'Ð',
    '&Ntilde;': 'Ñ',
    '&Ograve;': 'Ò',
    '&Oacute;': 'Ó',
    '&Ocirc;': 'Ô',
    '&Otilde;': 'Õ',
    '&Ouml;': 'Ö',
    '&Oslash;': 'Ø',
    '&Ugrave;': 'Ù',
    '&Uacute;': 'Ú',
    '&Ucirc;': 'Û',
    '&Uuml;': 'Ü',
    '&Yacute;': 'Ý',
    '&THORN;': 'Þ',
    '&szlig;': 'ß',
    '&agrave;': 'à',
    '&aacute;': 'á',
    '&acirc;': 'â',
    '&atilde;': 'ã',
    '&auml;': 'ä',
    '&aring;': 'å',
    '&aelig;': 'æ',
    '&ccedil;': 'ç',
    '&egrave;': 'è',
    '&eacute;': 'é',
    '&ecirc;': 'ê',
    '&euml;': 'ë',
    '&igrave;': 'ì',
    '&iacute;': 'í',
    '&icirc;': 'î',
    '&iuml;': 'ï',
    '&eth;': 'ð',
    '&ntilde;': 'ñ',
    '&ograve;': 'ò',
    '&oacute;': 'ó',
    '&ocirc;': 'ô',
    '&otilde;': 'õ',
    '&ouml;': 'ö',
    '&oslash;': 'ø',
    '&ugrave;': 'ù',
    '&uacute;': 'ú',
    '&ucirc;': 'û',
    '&uuml;': 'ü',
    '&yacute;': 'ý',
    '&thorn;': 'þ',
    '&yuml;': 'ÿ',
    '&iexcl;': '¡',
    '&iquest;': '¿',
    '&fnof;': 'ƒ',
    '&circ;': 'ˆ',
    '&tilde;': '˜',
    '&OElig;': 'Œ',
    '&oelig;': 'œ',
    '&Scaron;': 'Š',
    '&scaron;': 'š',
    '&Yuml;': 'Ÿ',
    '&ordf;': 'ª',
    '&ordm;': 'º',
    '&macr;': '¯',
    '&acute;': '´',
    '&cedil;': '¸',
    '&sup1;': '¹',
    '&sup2;': '²',
    '&sup3;': '³',
    '&frac14;': '¼',
    '&frac12;': '½',
    '&frac34;': '¾',
    '&spades;': '♠',
    '&clubs;': '♣',
    '&hearts;': '♥',
    '&diams;': '♦',
    '&loz;': '◊',
    '&oline;': '‾',
    '&frasl;': '⁄',
    '&weierp;': '℘',
    '&image;': 'ℑ',
    '&real;': 'ℜ',
    '&alefsym;': 'ℵ'
};
const entityPattern = new RegExp(Object.keys(commonEntities).map((entity)=>entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const decodeHtmlEntities = (text)=>text.replace(entityPattern, (match)=>commonEntities[match]).replace(/&#(\d+);/g, (_, num)=>String.fromCharCode(parseInt(num, 10))).replace(/&#x([0-9a-fA-F]+);/g, (_, hex)=>String.fromCharCode(parseInt(hex, 16)));
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/TranslationParserError.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TranslationParserError",
    ()=>TranslationParserError
]);
class TranslationParserError extends Error {
    constructor(message, position, translationString){
        super(message);
        this.name = 'TranslationParserError';
        this.position = position;
        this.translationString = translationString;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, TranslationParserError);
        }
    }
}
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/tokenizer.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "tokenize",
    ()=>tokenize
]);
const tokenize = (translation)=>{
    const tokens = [];
    let position = 0;
    let currentText = '';
    const flushText = ()=>{
        if (currentText) {
            tokens.push({
                type: 'Text',
                value: currentText,
                position: position - currentText.length
            });
            currentText = '';
        }
    };
    while(position < translation.length){
        const char = translation[position];
        if (char === '<') {
            const tagMatch = translation.slice(position).match(/^<(\d+)>/);
            if (tagMatch) {
                flushText();
                tokens.push({
                    type: 'TagOpen',
                    value: tagMatch[0],
                    position,
                    tagNumber: parseInt(tagMatch[1], 10)
                });
                position += tagMatch[0].length;
            } else {
                const closeTagMatch = translation.slice(position).match(/^<\/(\d+)>/);
                if (closeTagMatch) {
                    flushText();
                    tokens.push({
                        type: 'TagClose',
                        value: closeTagMatch[0],
                        position,
                        tagNumber: parseInt(closeTagMatch[1], 10)
                    });
                    position += closeTagMatch[0].length;
                } else {
                    currentText += char;
                    position += 1;
                }
            }
        } else {
            currentText += char;
            position += 1;
        }
    }
    flushText();
    return tokens;
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/renderTranslation.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "renderTranslation",
    ()=>renderTranslation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$TranslationParserError$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/TranslationParserError.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$tokenizer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/tokenizer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$htmlEntityDecoder$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/htmlEntityDecoder.js [app-client] (ecmascript)");
;
;
;
;
const renderDeclarationNode = (declaration, children, childDeclarations)=>{
    const { type, props = {} } = declaration;
    if (props.children && Array.isArray(props.children) && childDeclarations) {
        const { children: _childrenToRemove, ...propsWithoutChildren } = props;
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(type, propsWithoutChildren, ...children);
    }
    if (children.length === 0) {
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(type, props);
    }
    if (children.length === 1) {
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(type, props, children[0]);
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(type, props, ...children);
};
const renderTranslation = (translation, declarations = [])=>{
    if (!translation) {
        return [];
    }
    const tokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$tokenizer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tokenize"])(translation);
    const result = [];
    const stack = [];
    const literalTagNumbers = new Set();
    const getCurrentDeclarations = ()=>{
        if (stack.length === 0) {
            return declarations;
        }
        const parentFrame = stack[stack.length - 1];
        if (parentFrame.declaration.props?.children && Array.isArray(parentFrame.declaration.props.children)) {
            return parentFrame.declaration.props.children;
        }
        return parentFrame.declarations;
    };
    tokens.forEach((token)=>{
        switch(token.type){
            case 'Text':
                {
                    const decoded = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$htmlEntityDecoder$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["decodeHtmlEntities"])(token.value);
                    const targetArray = stack.length > 0 ? stack[stack.length - 1].children : result;
                    targetArray.push(decoded);
                }
                break;
            case 'TagOpen':
                {
                    const { tagNumber } = token;
                    const currentDeclarations = getCurrentDeclarations();
                    const declaration = currentDeclarations[tagNumber];
                    if (!declaration) {
                        literalTagNumbers.add(tagNumber);
                        const literalText = `<${tagNumber}>`;
                        const targetArray = stack.length > 0 ? stack[stack.length - 1].children : result;
                        targetArray.push(literalText);
                        break;
                    }
                    stack.push({
                        tagNumber,
                        children: [],
                        position: token.position,
                        declaration,
                        declarations: currentDeclarations
                    });
                }
                break;
            case 'TagClose':
                {
                    const { tagNumber } = token;
                    if (literalTagNumbers.has(tagNumber)) {
                        const literalText = `</${tagNumber}>`;
                        const literalTargetArray = stack.length > 0 ? stack[stack.length - 1].children : result;
                        literalTargetArray.push(literalText);
                        literalTagNumbers.delete(tagNumber);
                        break;
                    }
                    if (stack.length === 0) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$TranslationParserError$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TranslationParserError"](`Unexpected closing tag </${tagNumber}> at position ${token.position}`, token.position, translation);
                    }
                    const frame = stack.pop();
                    if (frame.tagNumber !== tagNumber) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$TranslationParserError$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TranslationParserError"](`Mismatched tags: expected </${frame.tagNumber}> but got </${tagNumber}> at position ${token.position}`, token.position, translation);
                    }
                    const element = renderDeclarationNode(frame.declaration, frame.children, frame.declarations);
                    const elementTargetArray = stack.length > 0 ? stack[stack.length - 1].children : result;
                    elementTargetArray.push(element);
                }
                break;
        }
    });
    if (stack.length > 0) {
        const unclosed = stack[stack.length - 1];
        throw new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$TranslationParserError$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TranslationParserError"](`Unclosed tag <${unclosed.tagNumber}> at position ${unclosed.position}`, unclosed.position, translation);
    }
    return result;
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/index.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$htmlEntityDecoder$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/htmlEntityDecoder.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$renderTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/renderTranslation.js [app-client] (ecmascript)");
;
;
;
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransWithoutContext.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IcuTransWithoutContext",
    ()=>IcuTransWithoutContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$renderTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransUtils/renderTranslation.js [app-client] (ecmascript)");
;
;
;
;
function IcuTransWithoutContext({ i18nKey, defaultTranslation, content, ns, values = {}, i18n: i18nFromProps, t: tFromProps }) {
    const i18n = i18nFromProps || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getI18n"])();
    if (!i18n) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warnOnce"])(i18n, 'NO_I18NEXT_INSTANCE', `IcuTrans: You need to pass in an i18next instance using i18nextReactModule`, {
            i18nKey
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Fragment, {}, defaultTranslation);
    }
    const t = tFromProps || i18n.t?.bind(i18n) || ((k)=>k);
    let namespaces = ns || t.ns || i18n.options?.defaultNS;
    namespaces = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(namespaces) ? [
        namespaces
    ] : namespaces || [
        'translation'
    ];
    let mergedValues = values;
    if (i18n.options?.interpolation?.defaultVariables) {
        mergedValues = values && Object.keys(values).length > 0 ? {
            ...values,
            ...i18n.options.interpolation.defaultVariables
        } : {
            ...i18n.options.interpolation.defaultVariables
        };
    }
    const translation = t(i18nKey, {
        defaultValue: defaultTranslation,
        ...mergedValues,
        ns: namespaces
    });
    try {
        const rendered = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransUtils$2f$renderTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["renderTranslation"])(translation, content);
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Fragment, {}, ...rendered);
    } catch (error) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warn"])(i18n, 'ICU_TRANS_RENDER_ERROR', `IcuTrans component error for key "${i18nKey}": ${error.message}`, {
            i18nKey,
            error
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Fragment, {}, translation);
    }
}
IcuTransWithoutContext.displayName = 'IcuTransWithoutContext';
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTrans.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IcuTrans",
    ()=>IcuTrans
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransWithoutContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransWithoutContext.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/context.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)");
;
;
;
function IcuTrans({ i18nKey, defaultTranslation, content, ns, values = {}, i18n: i18nFromProps, t: tFromProps }) {
    const { i18n: i18nFromContext, defaultNS: defaultNSFromContext } = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["I18nContext"]) || {};
    const i18n = i18nFromProps || i18nFromContext || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getI18n"])();
    const t = tFromProps || i18n?.t.bind(i18n);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransWithoutContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IcuTransWithoutContext"])({
        i18nKey,
        defaultTranslation,
        content,
        ns: ns || t?.ns || defaultNSFromContext || i18n?.options?.defaultNS,
        values,
        i18n,
        t: tFromProps
    });
}
IcuTrans.displayName = 'IcuTrans';
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/useTranslation.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useTranslation",
    ()=>useTranslation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$use$2d$sync$2d$external$2d$store$2f$shim$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/use-sync-external-store/shim/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/context.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/defaults.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/utils.js [app-client] (ecmascript)");
;
;
;
;
const notReadyT = (k, optsOrDefaultValue)=>{
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(optsOrDefaultValue)) return optsOrDefaultValue;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isObject"])(optsOrDefaultValue) && (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(optsOrDefaultValue.defaultValue)) return optsOrDefaultValue.defaultValue;
    if (typeof k === 'function') return '';
    if (Array.isArray(k)) {
        const last = k[k.length - 1];
        return typeof last === 'function' ? '' : last;
    }
    return k;
};
const notReadySnapshot = {
    t: notReadyT,
    ready: false
};
const dummySubscribe = ()=>()=>{};
const useTranslation = (ns, props = {})=>{
    const { i18n: i18nFromProps } = props;
    const { i18n: i18nFromContext, defaultNS: defaultNSFromContext } = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["I18nContext"]) || {};
    const i18n = i18nFromProps || i18nFromContext || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getI18n"])();
    if (i18n && !i18n.reportNamespaces) i18n.reportNamespaces = new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ReportNamespaces"]();
    if (!i18n) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warnOnce"])(i18n, 'NO_I18NEXT_INSTANCE', 'useTranslation: You will need to pass in an i18next instance by using initReactI18next');
    }
    const i18nOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useTranslation.useMemo[i18nOptions]": ()=>({
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDefaults"])(),
                ...i18n?.options?.react,
                ...props
            })
    }["useTranslation.useMemo[i18nOptions]"], [
        i18n,
        props
    ]);
    const { useSuspense, keyPrefix } = i18nOptions;
    const nsOrContext = ns || defaultNSFromContext || i18n?.options?.defaultNS;
    const unstableNamespaces = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isString"])(nsOrContext) ? [
        nsOrContext
    ] : nsOrContext || [
        'translation'
    ];
    const namespaces = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useTranslation.useMemo[namespaces]": ()=>unstableNamespaces
    }["useTranslation.useMemo[namespaces]"], unstableNamespaces);
    i18n?.reportNamespaces?.addUsedNamespaces?.(namespaces);
    const revisionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const subscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTranslation.useCallback[subscribe]": (callback)=>{
            if (!i18n) return dummySubscribe;
            const { bindI18n, bindI18nStore } = i18nOptions;
            const wrappedCallback = {
                "useTranslation.useCallback[subscribe].wrappedCallback": ()=>{
                    revisionRef.current += 1;
                    callback();
                }
            }["useTranslation.useCallback[subscribe].wrappedCallback"];
            if (bindI18n) i18n.on(bindI18n, wrappedCallback);
            if (bindI18nStore) i18n.store.on(bindI18nStore, wrappedCallback);
            return ({
                "useTranslation.useCallback[subscribe]": ()=>{
                    if (bindI18n) bindI18n.split(' ').forEach({
                        "useTranslation.useCallback[subscribe]": (e)=>i18n.off(e, wrappedCallback)
                    }["useTranslation.useCallback[subscribe]"]);
                    if (bindI18nStore) bindI18nStore.split(' ').forEach({
                        "useTranslation.useCallback[subscribe]": (e)=>i18n.store.off(e, wrappedCallback)
                    }["useTranslation.useCallback[subscribe]"]);
                }
            })["useTranslation.useCallback[subscribe]"];
        }
    }["useTranslation.useCallback[subscribe]"], [
        i18n,
        i18nOptions
    ]);
    const snapshotRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])();
    const getSnapshot = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTranslation.useCallback[getSnapshot]": ()=>{
            if (!i18n) {
                return notReadySnapshot;
            }
            const calculatedReady = !!(i18n.isInitialized || i18n.initializedStoreOnce) && namespaces.every({
                "useTranslation.useCallback[getSnapshot]": (n)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasLoadedNamespace"])(n, i18n, i18nOptions)
            }["useTranslation.useCallback[getSnapshot]"]);
            const currentLng = props.lng || i18n.language;
            const currentRevision = revisionRef.current;
            const lastSnapshot = snapshotRef.current;
            if (lastSnapshot && lastSnapshot.ready === calculatedReady && lastSnapshot.lng === currentLng && lastSnapshot.keyPrefix === keyPrefix && lastSnapshot.revision === currentRevision) {
                return lastSnapshot;
            }
            const calculatedT = i18n.getFixedT(currentLng, i18nOptions.nsMode === 'fallback' ? namespaces : namespaces[0], keyPrefix);
            const newSnapshot = {
                t: calculatedT,
                ready: calculatedReady,
                lng: currentLng,
                keyPrefix,
                revision: currentRevision
            };
            snapshotRef.current = newSnapshot;
            return newSnapshot;
        }
    }["useTranslation.useCallback[getSnapshot]"], [
        i18n,
        namespaces,
        keyPrefix,
        i18nOptions,
        props.lng
    ]);
    const [loadCount, setLoadCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const { t, ready } = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$use$2d$sync$2d$external$2d$store$2f$shim$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(subscribe, getSnapshot, getSnapshot);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useTranslation.useEffect": ()=>{
            if (i18n && !ready && !useSuspense) {
                const onLoaded = {
                    "useTranslation.useEffect.onLoaded": ()=>setLoadCount({
                            "useTranslation.useEffect.onLoaded": (c)=>c + 1
                        }["useTranslation.useEffect.onLoaded"])
                }["useTranslation.useEffect.onLoaded"];
                if (props.lng) {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadLanguages"])(i18n, props.lng, namespaces, onLoaded);
                } else {
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadNamespaces"])(i18n, namespaces, onLoaded);
                }
            }
        }
    }["useTranslation.useEffect"], [
        i18n,
        props.lng,
        namespaces,
        ready,
        useSuspense,
        loadCount
    ]);
    const finalI18n = i18n || {};
    const wrapperRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const wrapperLangRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])();
    const createI18nWrapper = (original)=>{
        const descriptors = Object.getOwnPropertyDescriptors(original);
        if (descriptors.__original) delete descriptors.__original;
        const wrapper = Object.create(Object.getPrototypeOf(original), descriptors);
        if (!Object.prototype.hasOwnProperty.call(wrapper, '__original')) {
            try {
                Object.defineProperty(wrapper, '__original', {
                    value: original,
                    writable: false,
                    enumerable: false,
                    configurable: false
                });
            } catch (_) {}
        }
        return wrapper;
    };
    const ret = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useTranslation.useMemo[ret]": ()=>{
            const original = finalI18n;
            const lang = original?.language;
            let i18nWrapper = original;
            if ("TURBOPACK compile-time truthy", 1) {
                if (wrapperRef.current && wrapperRef.current.__original === original) {
                    if (wrapperLangRef.current !== lang) {
                        i18nWrapper = createI18nWrapper(original);
                        wrapperRef.current = i18nWrapper;
                        wrapperLangRef.current = lang;
                    } else {
                        i18nWrapper = wrapperRef.current;
                    }
                } else {
                    i18nWrapper = createI18nWrapper(original);
                    wrapperRef.current = i18nWrapper;
                    wrapperLangRef.current = lang;
                }
            }
            const effectiveT = !ready && !useSuspense ? ({
                "useTranslation.useMemo[ret]": (...args)=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warnOnce"])(i18n, 'USE_T_BEFORE_READY', 'useTranslation: t was called before ready. When using useSuspense: false, make sure to check the ready flag before using t.');
                    return t(...args);
                }
            })["useTranslation.useMemo[ret]"] : t;
            const arr = [
                effectiveT,
                i18nWrapper,
                ready
            ];
            arr.t = effectiveT;
            arr.i18n = i18nWrapper;
            arr.ready = ready;
            return arr;
        }
    }["useTranslation.useMemo[ret]"], [
        t,
        finalI18n,
        ready,
        finalI18n.resolvedLanguage,
        finalI18n.language,
        finalI18n.languages
    ]);
    if (i18n && useSuspense && !ready) {
        throw new Promise((resolve)=>{
            const onLoaded = ()=>resolve();
            if (props.lng) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadLanguages"])(i18n, props.lng, namespaces, onLoaded);
            } else {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadNamespaces"])(i18n, namespaces, onLoaded);
            }
        });
    }
    return ret;
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/withTranslation.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "withTranslation",
    ()=>withTranslation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/useTranslation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/utils.js [app-client] (ecmascript)");
;
;
;
const withTranslation = (ns, options = {})=>function Extend(WrappedComponent) {
        function I18nextWithTranslation({ forwardedRef, ...rest }) {
            const [t, i18n, ready] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTranslation"])(ns, {
                ...rest,
                keyPrefix: options.keyPrefix
            });
            const passDownProps = {
                ...rest,
                t,
                i18n,
                tReady: ready
            };
            if (options.withRef && forwardedRef) {
                passDownProps.ref = forwardedRef;
            } else if (!options.withRef && forwardedRef) {
                passDownProps.forwardedRef = forwardedRef;
            }
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(WrappedComponent, passDownProps);
        }
        I18nextWithTranslation.displayName = `withI18nextTranslation(${(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDisplayName"])(WrappedComponent)})`;
        I18nextWithTranslation.WrappedComponent = WrappedComponent;
        const forwardRef = (props, ref)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(I18nextWithTranslation, Object.assign({}, props, {
                forwardedRef: ref
            }));
        return options.withRef ? (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(forwardRef) : I18nextWithTranslation;
    };
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/Translation.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Translation",
    ()=>Translation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/useTranslation.js [app-client] (ecmascript)");
;
const Translation = ({ ns, children, ...options })=>{
    const [t, i18n, ready] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTranslation"])(ns, options);
    return children(t, {
        i18n,
        lng: i18n?.language
    }, ready);
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/I18nextProvider.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "I18nextProvider",
    ()=>I18nextProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/context.js [app-client] (ecmascript) <locals>");
;
;
function I18nextProvider({ i18n, defaultNS, children }) {
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "I18nextProvider.useMemo[value]": ()=>({
                i18n,
                defaultNS
            })
    }["I18nextProvider.useMemo[value]"], [
        i18n,
        defaultNS
    ]);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["I18nContext"].Provider, {
        value
    }, children);
}
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/useSSR.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSSR",
    ()=>useSSR
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/context.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/i18nInstance.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/utils.js [app-client] (ecmascript)");
;
;
;
const useSSR = (initialI18nStore, initialLanguage, props = {})=>{
    const { i18n: i18nFromProps } = props;
    const { i18n: i18nFromContext } = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["I18nContext"]) || {};
    const i18n = i18nFromProps || i18nFromContext || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$i18nInstance$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getI18n"])();
    if (!i18n) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warnOnce"])(i18n, 'NO_I18NEXT_INSTANCE', 'useSSR: You will need to pass in an i18next instance by using initReactI18next or by passing it via props or context. In monorepo setups, make sure there is only one instance of react-i18next.');
        return;
    }
    if (i18n.options?.isClone) return;
    if (initialI18nStore && !i18n.initializedStoreOnce) {
        if (!i18n.services?.resourceStore) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["warnOnce"])(i18n, 'I18N_NOT_INITIALIZED', 'useSSR: i18n instance was found but not initialized (services.resourceStore is missing). Make sure you call i18next.init() before using useSSR — e.g. at module level, not only in getStaticProps/getServerSideProps.');
            return;
        }
        i18n.services.resourceStore.data = initialI18nStore;
        i18n.options.ns = Object.values(initialI18nStore).reduce((mem, lngResources)=>{
            Object.keys(lngResources).forEach((ns)=>{
                if (mem.indexOf(ns) < 0) mem.push(ns);
            });
            return mem;
        }, i18n.options.ns);
        i18n.initializedStoreOnce = true;
        i18n.isInitialized = true;
    }
    if (initialLanguage && !i18n.initializedLanguageOnce) {
        i18n.changeLanguage(initialLanguage);
        i18n.initializedLanguageOnce = true;
    }
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/withSSR.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "withSSR",
    ()=>withSSR
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useSSR$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/useSSR.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/context.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/utils.js [app-client] (ecmascript)");
;
;
;
;
const withSSR = ()=>function Extend(WrappedComponent) {
        function I18nextWithSSR({ initialI18nStore, initialLanguage, ...rest }) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useSSR$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSSR"])(initialI18nStore, initialLanguage);
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(WrappedComponent, {
                ...rest
            });
        }
        I18nextWithSSR.getInitialProps = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["composeInitialProps"])(WrappedComponent);
        I18nextWithSSR.displayName = `withI18nextSSR(${(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDisplayName"])(WrappedComponent)})`;
        I18nextWithSSR.WrappedComponent = WrappedComponent;
        return I18nextWithSSR;
    };
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/index.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "date",
    ()=>date,
    "number",
    ()=>number,
    "plural",
    ()=>plural,
    "select",
    ()=>select,
    "selectOrdinal",
    ()=>selectOrdinal,
    "time",
    ()=>time
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$Trans$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/Trans.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$TransWithoutContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/TransWithoutContext.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTrans$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTrans.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$IcuTransWithoutContext$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/IcuTransWithoutContext.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/useTranslation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$withTranslation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/withTranslation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$Translation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/Translation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$I18nextProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/I18nextProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$withSSR$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/withSSR.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$useSSR$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/useSSR.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$initReactI18next$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/initReactI18next.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$defaults$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/defaults.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$react$2d$i18next$2f$dist$2f$es$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/react-i18next/dist/es/context.js [app-client] (ecmascript) <locals>");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const date = ()=>'';
const time = ()=>'';
const number = ()=>'';
const select = ()=>'';
const plural = ()=>'';
const selectOrdinal = ()=>'';
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/**
 * @license React
 * use-sync-external-store-shim.development.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */ "use strict";
"production" !== ("TURBOPACK compile-time value", "development") && function() {
    function is(x, y) {
        return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    function useSyncExternalStore$2(subscribe, getSnapshot) {
        didWarnOld18Alpha || void 0 === React.startTransition || (didWarnOld18Alpha = !0, console.error("You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."));
        var value = getSnapshot();
        if (!didWarnUncachedGetSnapshot) {
            var cachedValue = getSnapshot();
            objectIs(value, cachedValue) || (console.error("The result of getSnapshot should be cached to avoid an infinite loop"), didWarnUncachedGetSnapshot = !0);
        }
        cachedValue = useState({
            inst: {
                value: value,
                getSnapshot: getSnapshot
            }
        });
        var inst = cachedValue[0].inst, forceUpdate = cachedValue[1];
        useLayoutEffect({
            "useSyncExternalStore$2.useLayoutEffect": function() {
                inst.value = value;
                inst.getSnapshot = getSnapshot;
                checkIfSnapshotChanged(inst) && forceUpdate({
                    inst: inst
                });
            }
        }["useSyncExternalStore$2.useLayoutEffect"], [
            subscribe,
            value,
            getSnapshot
        ]);
        useEffect({
            "useSyncExternalStore$2.useEffect": function() {
                checkIfSnapshotChanged(inst) && forceUpdate({
                    inst: inst
                });
                return subscribe({
                    "useSyncExternalStore$2.useEffect": function() {
                        checkIfSnapshotChanged(inst) && forceUpdate({
                            inst: inst
                        });
                    }
                }["useSyncExternalStore$2.useEffect"]);
            }
        }["useSyncExternalStore$2.useEffect"], [
            subscribe
        ]);
        useDebugValue(value);
        return value;
    }
    function checkIfSnapshotChanged(inst) {
        var latestGetSnapshot = inst.getSnapshot;
        inst = inst.value;
        try {
            var nextValue = latestGetSnapshot();
            return !objectIs(inst, nextValue);
        } catch (error) {
            return !0;
        }
    }
    function useSyncExternalStore$1(subscribe, getSnapshot) {
        return getSnapshot();
    }
    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var React = __turbopack_context__.r("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)"), objectIs = "function" === typeof Object.is ? Object.is : is, useState = React.useState, useEffect = React.useEffect, useLayoutEffect = React.useLayoutEffect, useDebugValue = React.useDebugValue, didWarnOld18Alpha = !1, didWarnUncachedGetSnapshot = !1, shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
    exports.useSyncExternalStore = void 0 !== React.useSyncExternalStore ? React.useSyncExternalStore : shim;
    "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
}();
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/use-sync-external-store/shim/index.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
'use strict';
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    module.exports = __turbopack_context__.r("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js [app-client] (ecmascript)");
}
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/i18next-browser-languagedetector/dist/esm/i18nextBrowserLanguageDetector.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Browser
]);
const { slice, forEach } = [];
function defaults(obj) {
    forEach.call(slice.call(arguments, 1), (source)=>{
        if (source) {
            for(const prop in source){
                if (obj[prop] === undefined) obj[prop] = source[prop];
            }
        }
    });
    return obj;
}
function hasXSS(input) {
    if (typeof input !== 'string') return false;
    // Common XSS attack patterns
    const xssPatterns = [
        /<\s*script.*?>/i,
        /<\s*\/\s*script\s*>/i,
        /<\s*img.*?on\w+\s*=/i,
        /<\s*\w+\s*on\w+\s*=.*?>/i,
        /javascript\s*:/i,
        /vbscript\s*:/i,
        /expression\s*\(/i,
        /eval\s*\(/i,
        /alert\s*\(/i,
        /document\.cookie/i,
        /document\.write\s*\(/i,
        /window\.location/i,
        /innerHTML/i
    ];
    return xssPatterns.some((pattern)=>pattern.test(input));
}
// eslint-disable-next-line no-control-regex
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
const serializeCookie = function(name, val) {
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {
        path: '/'
    };
    const opt = options;
    const value = encodeURIComponent(val);
    let str = `${name}=${value}`;
    if (opt.maxAge > 0) {
        const maxAge = opt.maxAge - 0;
        if (Number.isNaN(maxAge)) throw new Error('maxAge should be a Number');
        str += `; Max-Age=${Math.floor(maxAge)}`;
    }
    if (opt.domain) {
        if (!fieldContentRegExp.test(opt.domain)) {
            throw new TypeError('option domain is invalid');
        }
        str += `; Domain=${opt.domain}`;
    }
    if (opt.path) {
        if (!fieldContentRegExp.test(opt.path)) {
            throw new TypeError('option path is invalid');
        }
        str += `; Path=${opt.path}`;
    }
    if (opt.expires) {
        if (typeof opt.expires.toUTCString !== 'function') {
            throw new TypeError('option expires is invalid');
        }
        str += `; Expires=${opt.expires.toUTCString()}`;
    }
    if (opt.httpOnly) str += '; HttpOnly';
    if (opt.secure) str += '; Secure';
    if (opt.sameSite) {
        const sameSite = typeof opt.sameSite === 'string' ? opt.sameSite.toLowerCase() : opt.sameSite;
        switch(sameSite){
            case true:
                str += '; SameSite=Strict';
                break;
            case 'lax':
                str += '; SameSite=Lax';
                break;
            case 'strict':
                str += '; SameSite=Strict';
                break;
            case 'none':
                str += '; SameSite=None';
                break;
            default:
                throw new TypeError('option sameSite is invalid');
        }
    }
    if (opt.partitioned) str += '; Partitioned';
    return str;
};
const cookie = {
    create (name, value, minutes, domain) {
        let cookieOptions = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {
            path: '/',
            sameSite: 'strict'
        };
        if (minutes) {
            cookieOptions.expires = new Date();
            cookieOptions.expires.setTime(cookieOptions.expires.getTime() + minutes * 60 * 1000);
        }
        if (domain) cookieOptions.domain = domain;
        document.cookie = serializeCookie(name, value, cookieOptions);
    },
    read (name) {
        const nameEQ = `${name}=`;
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++){
            let c = ca[i];
            while(c.charAt(0) === ' ')c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },
    remove (name, domain) {
        this.create(name, '', -1, domain);
    }
};
var cookie$1 = {
    name: 'cookie',
    // Deconstruct the options object and extract the lookupCookie property
    lookup (_ref) {
        let { lookupCookie } = _ref;
        if (lookupCookie && typeof document !== 'undefined') {
            return cookie.read(lookupCookie) || undefined;
        }
        return undefined;
    },
    // Deconstruct the options object and extract the lookupCookie, cookieMinutes, cookieDomain, and cookieOptions properties
    cacheUserLanguage (lng, _ref2) {
        let { lookupCookie, cookieMinutes, cookieDomain, cookieOptions } = _ref2;
        if (lookupCookie && typeof document !== 'undefined') {
            cookie.create(lookupCookie, lng, cookieMinutes, cookieDomain, cookieOptions);
        }
    }
};
var querystring = {
    name: 'querystring',
    // Deconstruct the options object and extract the lookupQuerystring property
    lookup (_ref) {
        let { lookupQuerystring } = _ref;
        let found;
        if (typeof window !== 'undefined') {
            let { search } = window.location;
            if (!window.location.search && window.location.hash?.indexOf('?') > -1) {
                search = window.location.hash.substring(window.location.hash.indexOf('?'));
            }
            const query = search.substring(1);
            const params = query.split('&');
            for(let i = 0; i < params.length; i++){
                const pos = params[i].indexOf('=');
                if (pos > 0) {
                    const key = params[i].substring(0, pos);
                    if (key === lookupQuerystring) {
                        found = params[i].substring(pos + 1);
                    }
                }
            }
        }
        return found;
    }
};
var hash = {
    name: 'hash',
    // Deconstruct the options object and extract the lookupHash property and the lookupFromHashIndex property
    lookup (_ref) {
        let { lookupHash, lookupFromHashIndex } = _ref;
        let found;
        if (typeof window !== 'undefined') {
            const { hash } = window.location;
            if (hash && hash.length > 2) {
                const query = hash.substring(1);
                if (lookupHash) {
                    const params = query.split('&');
                    for(let i = 0; i < params.length; i++){
                        const pos = params[i].indexOf('=');
                        if (pos > 0) {
                            const key = params[i].substring(0, pos);
                            if (key === lookupHash) {
                                found = params[i].substring(pos + 1);
                            }
                        }
                    }
                }
                if (found) return found;
                if (!found && lookupFromHashIndex > -1) {
                    const language = hash.match(/\/([a-zA-Z-]*)/g);
                    if (!Array.isArray(language)) return undefined;
                    const index = typeof lookupFromHashIndex === 'number' ? lookupFromHashIndex : 0;
                    return language[index]?.replace('/', '');
                }
            }
        }
        return found;
    }
};
let hasLocalStorageSupport = null;
const localStorageAvailable = ()=>{
    if (hasLocalStorageSupport !== null) return hasLocalStorageSupport;
    try {
        hasLocalStorageSupport = typeof window !== 'undefined' && window.localStorage !== null;
        if (!hasLocalStorageSupport) {
            return false;
        }
        const testKey = 'i18next.translate.boo';
        window.localStorage.setItem(testKey, 'foo');
        window.localStorage.removeItem(testKey);
    } catch (e) {
        hasLocalStorageSupport = false;
    }
    return hasLocalStorageSupport;
};
var localStorage = {
    name: 'localStorage',
    // Deconstruct the options object and extract the lookupLocalStorage property
    lookup (_ref) {
        let { lookupLocalStorage } = _ref;
        if (lookupLocalStorage && localStorageAvailable()) {
            return window.localStorage.getItem(lookupLocalStorage) || undefined; // Undefined ensures type consistency with the previous version of this function
        }
        return undefined;
    },
    // Deconstruct the options object and extract the lookupLocalStorage property
    cacheUserLanguage (lng, _ref2) {
        let { lookupLocalStorage } = _ref2;
        if (lookupLocalStorage && localStorageAvailable()) {
            window.localStorage.setItem(lookupLocalStorage, lng);
        }
    }
};
let hasSessionStorageSupport = null;
const sessionStorageAvailable = ()=>{
    if (hasSessionStorageSupport !== null) return hasSessionStorageSupport;
    try {
        hasSessionStorageSupport = typeof window !== 'undefined' && window.sessionStorage !== null;
        if (!hasSessionStorageSupport) {
            return false;
        }
        const testKey = 'i18next.translate.boo';
        window.sessionStorage.setItem(testKey, 'foo');
        window.sessionStorage.removeItem(testKey);
    } catch (e) {
        hasSessionStorageSupport = false;
    }
    return hasSessionStorageSupport;
};
var sessionStorage = {
    name: 'sessionStorage',
    lookup (_ref) {
        let { lookupSessionStorage } = _ref;
        if (lookupSessionStorage && sessionStorageAvailable()) {
            return window.sessionStorage.getItem(lookupSessionStorage) || undefined;
        }
        return undefined;
    },
    cacheUserLanguage (lng, _ref2) {
        let { lookupSessionStorage } = _ref2;
        if (lookupSessionStorage && sessionStorageAvailable()) {
            window.sessionStorage.setItem(lookupSessionStorage, lng);
        }
    }
};
var navigator$1 = {
    name: 'navigator',
    lookup (options) {
        const found = [];
        if (typeof navigator !== 'undefined') {
            const { languages, userLanguage, language } = navigator;
            if (languages) {
                // chrome only; not an array, so can't use .push.apply instead of iterating
                for(let i = 0; i < languages.length; i++){
                    found.push(languages[i]);
                }
            }
            if (userLanguage) {
                found.push(userLanguage);
            }
            if (language) {
                found.push(language);
            }
        }
        return found.length > 0 ? found : undefined;
    }
};
var htmlTag = {
    name: 'htmlTag',
    // Deconstruct the options object and extract the htmlTag property
    lookup (_ref) {
        let { htmlTag } = _ref;
        let found;
        const internalHtmlTag = htmlTag || (typeof document !== 'undefined' ? document.documentElement : null);
        if (internalHtmlTag && typeof internalHtmlTag.getAttribute === 'function') {
            found = internalHtmlTag.getAttribute('lang');
        }
        return found;
    }
};
var path = {
    name: 'path',
    // Deconstruct the options object and extract the lookupFromPathIndex property
    lookup (_ref) {
        let { lookupFromPathIndex } = _ref;
        if (typeof window === 'undefined') return undefined;
        const language = window.location.pathname.match(/\/([a-zA-Z-]*)/g);
        if (!Array.isArray(language)) return undefined;
        const index = typeof lookupFromPathIndex === 'number' ? lookupFromPathIndex : 0;
        return language[index]?.replace('/', '');
    }
};
var subdomain = {
    name: 'subdomain',
    lookup (_ref) {
        let { lookupFromSubdomainIndex } = _ref;
        // If given get the subdomain index else 1
        const internalLookupFromSubdomainIndex = typeof lookupFromSubdomainIndex === 'number' ? lookupFromSubdomainIndex + 1 : 1;
        // get all matches if window.location. is existing
        // first item of match is the match itself and the second is the first group match which should be the first subdomain match
        // is the hostname no public domain get the or option of localhost
        const language = typeof window !== 'undefined' && window.location?.hostname?.match(/^(\w{2,5})\.(([a-z0-9-]{1,63}\.[a-z]{2,6})|localhost)/i);
        // if there is no match (null) return undefined
        if (!language) return undefined;
        // return the given group match
        return language[internalLookupFromSubdomainIndex];
    }
};
// some environments, throws when accessing document.cookie
let canCookies = false;
try {
    // eslint-disable-next-line no-unused-expressions
    document.cookie;
    canCookies = true;
// eslint-disable-next-line no-empty
} catch (e) {}
const order = [
    'querystring',
    'cookie',
    'localStorage',
    'sessionStorage',
    'navigator',
    'htmlTag'
];
if (!canCookies) order.splice(1, 1);
const getDefaults = ()=>({
        order,
        lookupQuerystring: 'lng',
        lookupCookie: 'i18next',
        lookupLocalStorage: 'i18nextLng',
        lookupSessionStorage: 'i18nextLng',
        // cache user language
        caches: [
            'localStorage'
        ],
        excludeCacheFor: [
            'cimode'
        ],
        // cookieMinutes: 10,
        // cookieDomain: 'myDomain'
        convertDetectedLanguage: (l)=>l
    });
class Browser {
    constructor(services){
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        this.type = 'languageDetector';
        this.detectors = {};
        this.init(services, options);
    }
    init() {
        let services = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
            languageUtils: {}
        };
        let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        let i18nOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        this.services = services;
        this.options = defaults(options, this.options || {}, getDefaults());
        if (typeof this.options.convertDetectedLanguage === 'string' && this.options.convertDetectedLanguage.indexOf('15897') > -1) {
            this.options.convertDetectedLanguage = (l)=>l.replace('-', '_');
        }
        // backwards compatibility
        if (this.options.lookupFromUrlIndex) this.options.lookupFromPathIndex = this.options.lookupFromUrlIndex;
        this.i18nOptions = i18nOptions;
        this.addDetector(cookie$1);
        this.addDetector(querystring);
        this.addDetector(localStorage);
        this.addDetector(sessionStorage);
        this.addDetector(navigator$1);
        this.addDetector(htmlTag);
        this.addDetector(path);
        this.addDetector(subdomain);
        this.addDetector(hash);
    }
    addDetector(detector) {
        this.detectors[detector.name] = detector;
        return this;
    }
    detect() {
        let detectionOrder = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.options.order;
        let detected = [];
        detectionOrder.forEach((detectorName)=>{
            if (this.detectors[detectorName]) {
                let lookup = this.detectors[detectorName].lookup(this.options);
                if (lookup && typeof lookup === 'string') lookup = [
                    lookup
                ];
                if (lookup) detected = detected.concat(lookup);
            }
        });
        detected = detected.filter((d)=>d !== undefined && d !== null && !hasXSS(d)).map((d)=>this.options.convertDetectedLanguage(d));
        if (this.services && this.services.languageUtils && this.services.languageUtils.getBestMatchFromCodes) return detected; // new i18next v19.5.0
        return detected.length > 0 ? detected[0] : null; // a little backward compatibility
    }
    cacheUserLanguage(lng) {
        let caches = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.options.caches;
        if (!caches) return;
        if (this.options.excludeCacheFor && this.options.excludeCacheFor.indexOf(lng) > -1) return;
        caches.forEach((cacheName)=>{
            if (this.detectors[cacheName]) this.detectors[cacheName].cacheUserLanguage(lng, this.options);
        });
    }
}
Browser.type = 'languageDetector';
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next-themes/dist/index.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>J,
    "useTheme",
    ()=>z
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
"use client";
;
var M = (e, i, s, u, m, a, l, h)=>{
    let d = document.documentElement, w = [
        "light",
        "dark"
    ];
    function p(n) {
        (Array.isArray(e) ? e : [
            e
        ]).forEach((y)=>{
            let k = y === "class", S = k && a ? m.map((f)=>a[f] || f) : m;
            k ? (d.classList.remove(...S), d.classList.add(a && a[n] ? a[n] : n)) : d.setAttribute(y, n);
        }), R(n);
    }
    function R(n) {
        h && w.includes(n) && (d.style.colorScheme = n);
    }
    function c() {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (u) p(u);
    else try {
        let n = localStorage.getItem(i) || s, y = l && n === "system" ? c() : n;
        p(y);
    } catch (n) {}
};
var b = [
    "light",
    "dark"
], I = "(prefers-color-scheme: dark)", O = typeof window == "undefined", x = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](void 0), U = {
    setTheme: (e)=>{},
    themes: []
}, z = ()=>{
    var e;
    return (e = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](x)) != null ? e : U;
}, J = (e)=>__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](x) ? __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"](__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], null, e.children) : __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"](V, {
        ...e
    }), N = [
    "light",
    "dark"
], V = ({ forcedTheme: e, disableTransitionOnChange: i = !1, enableSystem: s = !0, enableColorScheme: u = !0, storageKey: m = "theme", themes: a = N, defaultTheme: l = s ? "system" : "light", attribute: h = "data-theme", value: d, children: w, nonce: p, scriptProps: R })=>{
    let [c, n] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        "V.useState": ()=>H(m, l)
    }["V.useState"]), [T, y] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        "V.useState": ()=>c === "system" ? E() : c
    }["V.useState"]), k = d ? Object.values(d) : a, S = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "V.useCallback[S]": (o)=>{
            let r = o;
            if (!r) return;
            o === "system" && s && (r = E());
            let v = d ? d[r] : r, C = i ? W(p) : null, P = document.documentElement, L = {
                "V.useCallback[S].L": (g)=>{
                    g === "class" ? (P.classList.remove(...k), v && P.classList.add(v)) : g.startsWith("data-") && (v ? P.setAttribute(g, v) : P.removeAttribute(g));
                }
            }["V.useCallback[S].L"];
            if (Array.isArray(h) ? h.forEach(L) : L(h), u) {
                let g = b.includes(l) ? l : null, D = b.includes(r) ? r : g;
                P.style.colorScheme = D;
            }
            C == null || C();
        }
    }["V.useCallback[S]"], [
        p
    ]), f = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "V.useCallback[f]": (o)=>{
            let r = typeof o == "function" ? o(c) : o;
            n(r);
            try {
                localStorage.setItem(m, r);
            } catch (v) {}
        }
    }["V.useCallback[f]"], [
        c
    ]), A = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "V.useCallback[A]": (o)=>{
            let r = E(o);
            y(r), c === "system" && s && !e && S("system");
        }
    }["V.useCallback[A]"], [
        c,
        e
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "V.useEffect": ()=>{
            let o = window.matchMedia(I);
            return o.addListener(A), A(o), ({
                "V.useEffect": ()=>o.removeListener(A)
            })["V.useEffect"];
        }
    }["V.useEffect"], [
        A
    ]), __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "V.useEffect": ()=>{
            let o = {
                "V.useEffect.o": (r)=>{
                    r.key === m && (r.newValue ? n(r.newValue) : f(l));
                }
            }["V.useEffect.o"];
            return window.addEventListener("storage", o), ({
                "V.useEffect": ()=>window.removeEventListener("storage", o)
            })["V.useEffect"];
        }
    }["V.useEffect"], [
        f
    ]), __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "V.useEffect": ()=>{
            S(e != null ? e : c);
        }
    }["V.useEffect"], [
        e,
        c
    ]);
    let Q = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"]({
        "V.useMemo[Q]": ()=>({
                theme: c,
                setTheme: f,
                forcedTheme: e,
                resolvedTheme: c === "system" ? T : c,
                themes: s ? [
                    ...a,
                    "system"
                ] : a,
                systemTheme: s ? T : void 0
            })
    }["V.useMemo[Q]"], [
        c,
        f,
        e,
        T,
        s,
        a
    ]);
    return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"](x.Provider, {
        value: Q
    }, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"](_, {
        forcedTheme: e,
        storageKey: m,
        attribute: h,
        enableSystem: s,
        enableColorScheme: u,
        defaultTheme: l,
        value: d,
        themes: a,
        nonce: p,
        scriptProps: R
    }), w);
}, _ = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"](({ forcedTheme: e, storageKey: i, attribute: s, enableSystem: u, enableColorScheme: m, defaultTheme: a, value: l, themes: h, nonce: d, scriptProps: w })=>{
    let p = JSON.stringify([
        s,
        i,
        a,
        e,
        h,
        l,
        u,
        m
    ]).slice(1, -1);
    return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("script", {
        ...w,
        suppressHydrationWarning: !0,
        nonce: typeof window == "undefined" ? d : "",
        dangerouslySetInnerHTML: {
            __html: `(${M.toString()})(${p})`
        }
    });
}), H = (e, i)=>{
    if (O) return;
    let s;
    try {
        s = localStorage.getItem(e) || void 0;
    } catch (u) {}
    return s || i;
}, W = (e)=>{
    let i = document.createElement("style");
    return e && i.setAttribute("nonce", e), i.appendChild(document.createTextNode("*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}")), document.head.appendChild(i), ()=>{
        window.getComputedStyle(document.body), setTimeout(()=>{
            document.head.removeChild(i);
        }, 1);
    };
}, E = (e)=>(e || (e = window.matchMedia(I)), e.matches ? "dark" : "light");
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster,
    "toast",
    ()=>toast,
    "useSonner",
    ()=>useSonner
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react-dom/index.js [app-client] (ecmascript)");
'use client';
function __insertCSS(code) {
    if (!code || typeof document == 'undefined') return;
    let head = document.head || document.getElementsByTagName('head')[0];
    let style = document.createElement('style');
    style.type = 'text/css';
    head.appendChild(style);
    style.styleSheet ? style.styleSheet.cssText = code : style.appendChild(document.createTextNode(code));
}
;
;
const getAsset = (type)=>{
    switch(type){
        case 'success':
            return SuccessIcon;
        case 'info':
            return InfoIcon;
        case 'warning':
            return WarningIcon;
        case 'error':
            return ErrorIcon;
        default:
            return null;
    }
};
const bars = Array(12).fill(0);
const Loader = ({ visible, className })=>{
    return /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("div", {
        className: [
            'sonner-loading-wrapper',
            className
        ].filter(Boolean).join(' '),
        "data-visible": visible
    }, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("div", {
        className: "sonner-spinner"
    }, bars.map((_, i)=>/*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("div", {
            className: "sonner-loading-bar",
            key: `spinner-bar-${i}`
        }))));
};
const SuccessIcon = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 20 20",
    fill: "currentColor",
    height: "20",
    width: "20"
}, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("path", {
    fillRule: "evenodd",
    d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
    clipRule: "evenodd"
}));
const WarningIcon = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    height: "20",
    width: "20"
}, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("path", {
    fillRule: "evenodd",
    d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
    clipRule: "evenodd"
}));
const InfoIcon = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 20 20",
    fill: "currentColor",
    height: "20",
    width: "20"
}, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("path", {
    fillRule: "evenodd",
    d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
    clipRule: "evenodd"
}));
const ErrorIcon = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 20 20",
    fill: "currentColor",
    height: "20",
    width: "20"
}, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("path", {
    fillRule: "evenodd",
    d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
    clipRule: "evenodd"
}));
const CloseIcon = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
}, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
}), /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
}));
const useIsDocumentHidden = ()=>{
    const [isDocumentHidden, setIsDocumentHidden] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(document.hidden);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "useIsDocumentHidden.useEffect": ()=>{
            const callback = {
                "useIsDocumentHidden.useEffect.callback": ()=>{
                    setIsDocumentHidden(document.hidden);
                }
            }["useIsDocumentHidden.useEffect.callback"];
            document.addEventListener('visibilitychange', callback);
            return ({
                "useIsDocumentHidden.useEffect": ()=>window.removeEventListener('visibilitychange', callback)
            })["useIsDocumentHidden.useEffect"];
        }
    }["useIsDocumentHidden.useEffect"], []);
    return isDocumentHidden;
};
let toastsCounter = 1;
class Observer {
    constructor(){
        // We use arrow functions to maintain the correct `this` reference
        this.subscribe = (subscriber)=>{
            this.subscribers.push(subscriber);
            return ()=>{
                const index = this.subscribers.indexOf(subscriber);
                this.subscribers.splice(index, 1);
            };
        };
        this.publish = (data)=>{
            this.subscribers.forEach((subscriber)=>subscriber(data));
        };
        this.addToast = (data)=>{
            this.publish(data);
            this.toasts = [
                ...this.toasts,
                data
            ];
        };
        this.create = (data)=>{
            var _data_id;
            const { message, ...rest } = data;
            const id = typeof (data == null ? void 0 : data.id) === 'number' || ((_data_id = data.id) == null ? void 0 : _data_id.length) > 0 ? data.id : toastsCounter++;
            const alreadyExists = this.toasts.find((toast)=>{
                return toast.id === id;
            });
            const dismissible = data.dismissible === undefined ? true : data.dismissible;
            if (this.dismissedToasts.has(id)) {
                this.dismissedToasts.delete(id);
            }
            if (alreadyExists) {
                this.toasts = this.toasts.map((toast)=>{
                    if (toast.id === id) {
                        this.publish({
                            ...toast,
                            ...data,
                            id,
                            title: message
                        });
                        return {
                            ...toast,
                            ...data,
                            id,
                            dismissible,
                            title: message
                        };
                    }
                    return toast;
                });
            } else {
                this.addToast({
                    title: message,
                    ...rest,
                    dismissible,
                    id
                });
            }
            return id;
        };
        this.dismiss = (id)=>{
            if (id) {
                this.dismissedToasts.add(id);
                requestAnimationFrame(()=>this.subscribers.forEach((subscriber)=>subscriber({
                            id,
                            dismiss: true
                        })));
            } else {
                this.toasts.forEach((toast)=>{
                    this.subscribers.forEach((subscriber)=>subscriber({
                            id: toast.id,
                            dismiss: true
                        }));
                });
            }
            return id;
        };
        this.message = (message, data)=>{
            return this.create({
                ...data,
                message
            });
        };
        this.error = (message, data)=>{
            return this.create({
                ...data,
                message,
                type: 'error'
            });
        };
        this.success = (message, data)=>{
            return this.create({
                ...data,
                type: 'success',
                message
            });
        };
        this.info = (message, data)=>{
            return this.create({
                ...data,
                type: 'info',
                message
            });
        };
        this.warning = (message, data)=>{
            return this.create({
                ...data,
                type: 'warning',
                message
            });
        };
        this.loading = (message, data)=>{
            return this.create({
                ...data,
                type: 'loading',
                message
            });
        };
        this.promise = (promise, data)=>{
            if (!data) {
                // Nothing to show
                return;
            }
            let id = undefined;
            if (data.loading !== undefined) {
                id = this.create({
                    ...data,
                    promise,
                    type: 'loading',
                    message: data.loading,
                    description: typeof data.description !== 'function' ? data.description : undefined
                });
            }
            const p = Promise.resolve(promise instanceof Function ? promise() : promise);
            let shouldDismiss = id !== undefined;
            let result;
            const originalPromise = p.then(async (response)=>{
                result = [
                    'resolve',
                    response
                ];
                const isReactElementResponse = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].isValidElement(response);
                if (isReactElementResponse) {
                    shouldDismiss = false;
                    this.create({
                        id,
                        type: 'default',
                        message: response
                    });
                } else if (isHttpResponse(response) && !response.ok) {
                    shouldDismiss = false;
                    const promiseData = typeof data.error === 'function' ? await data.error(`HTTP error! status: ${response.status}`) : data.error;
                    const description = typeof data.description === 'function' ? await data.description(`HTTP error! status: ${response.status}`) : data.description;
                    const isExtendedResult = typeof promiseData === 'object' && !__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].isValidElement(promiseData);
                    const toastSettings = isExtendedResult ? promiseData : {
                        message: promiseData
                    };
                    this.create({
                        id,
                        type: 'error',
                        description,
                        ...toastSettings
                    });
                } else if (response instanceof Error) {
                    shouldDismiss = false;
                    const promiseData = typeof data.error === 'function' ? await data.error(response) : data.error;
                    const description = typeof data.description === 'function' ? await data.description(response) : data.description;
                    const isExtendedResult = typeof promiseData === 'object' && !__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].isValidElement(promiseData);
                    const toastSettings = isExtendedResult ? promiseData : {
                        message: promiseData
                    };
                    this.create({
                        id,
                        type: 'error',
                        description,
                        ...toastSettings
                    });
                } else if (data.success !== undefined) {
                    shouldDismiss = false;
                    const promiseData = typeof data.success === 'function' ? await data.success(response) : data.success;
                    const description = typeof data.description === 'function' ? await data.description(response) : data.description;
                    const isExtendedResult = typeof promiseData === 'object' && !__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].isValidElement(promiseData);
                    const toastSettings = isExtendedResult ? promiseData : {
                        message: promiseData
                    };
                    this.create({
                        id,
                        type: 'success',
                        description,
                        ...toastSettings
                    });
                }
            }).catch(async (error)=>{
                result = [
                    'reject',
                    error
                ];
                if (data.error !== undefined) {
                    shouldDismiss = false;
                    const promiseData = typeof data.error === 'function' ? await data.error(error) : data.error;
                    const description = typeof data.description === 'function' ? await data.description(error) : data.description;
                    const isExtendedResult = typeof promiseData === 'object' && !__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].isValidElement(promiseData);
                    const toastSettings = isExtendedResult ? promiseData : {
                        message: promiseData
                    };
                    this.create({
                        id,
                        type: 'error',
                        description,
                        ...toastSettings
                    });
                }
            }).finally(()=>{
                if (shouldDismiss) {
                    // Toast is still in load state (and will be indefinitely — dismiss it)
                    this.dismiss(id);
                    id = undefined;
                }
                data.finally == null ? void 0 : data.finally.call(data);
            });
            const unwrap = ()=>new Promise((resolve, reject)=>originalPromise.then(()=>result[0] === 'reject' ? reject(result[1]) : resolve(result[1])).catch(reject));
            if (typeof id !== 'string' && typeof id !== 'number') {
                // cannot Object.assign on undefined
                return {
                    unwrap
                };
            } else {
                return Object.assign(id, {
                    unwrap
                });
            }
        };
        this.custom = (jsx, data)=>{
            const id = (data == null ? void 0 : data.id) || toastsCounter++;
            this.create({
                jsx: jsx(id),
                id,
                ...data
            });
            return id;
        };
        this.getActiveToasts = ()=>{
            return this.toasts.filter((toast)=>!this.dismissedToasts.has(toast.id));
        };
        this.subscribers = [];
        this.toasts = [];
        this.dismissedToasts = new Set();
    }
}
const ToastState = new Observer();
// bind this to the toast function
const toastFunction = (message, data)=>{
    const id = (data == null ? void 0 : data.id) || toastsCounter++;
    ToastState.addToast({
        title: message,
        ...data,
        id
    });
    return id;
};
const isHttpResponse = (data)=>{
    return data && typeof data === 'object' && 'ok' in data && typeof data.ok === 'boolean' && 'status' in data && typeof data.status === 'number';
};
const basicToast = toastFunction;
const getHistory = ()=>ToastState.toasts;
const getToasts = ()=>ToastState.getActiveToasts();
// We use `Object.assign` to maintain the correct types as we would lose them otherwise
const toast = Object.assign(basicToast, {
    success: ToastState.success,
    info: ToastState.info,
    warning: ToastState.warning,
    error: ToastState.error,
    custom: ToastState.custom,
    message: ToastState.message,
    promise: ToastState.promise,
    dismiss: ToastState.dismiss,
    loading: ToastState.loading
}, {
    getHistory,
    getToasts
});
__insertCSS("[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);background:var(--normal-bg);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}");
function isAction(action) {
    return action.label !== undefined;
}
// Visible toasts amount
const VISIBLE_TOASTS_AMOUNT = 3;
// Viewport padding
const VIEWPORT_OFFSET = '24px';
// Mobile viewport padding
const MOBILE_VIEWPORT_OFFSET = '16px';
// Default lifetime of a toasts (in ms)
const TOAST_LIFETIME = 4000;
// Default toast width
const TOAST_WIDTH = 356;
// Default gap between toasts
const GAP = 14;
// Threshold to dismiss a toast
const SWIPE_THRESHOLD = 45;
// Equal to exit animation duration
const TIME_BEFORE_UNMOUNT = 200;
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
function getDefaultSwipeDirections(position) {
    const [y, x] = position.split('-');
    const directions = [];
    if (y) {
        directions.push(y);
    }
    if (x) {
        directions.push(x);
    }
    return directions;
}
const Toast = (props)=>{
    var _toast_classNames, _toast_classNames1, _toast_classNames2, _toast_classNames3, _toast_classNames4, _toast_classNames5, _toast_classNames6, _toast_classNames7, _toast_classNames8;
    const { invert: ToasterInvert, toast, unstyled, interacting, setHeights, visibleToasts, heights, index, toasts, expanded, removeToast, defaultRichColors, closeButton: closeButtonFromToaster, style, cancelButtonStyle, actionButtonStyle, className = '', descriptionClassName = '', duration: durationFromToaster, position, gap, expandByDefault, classNames, icons, closeButtonAriaLabel = 'Close toast' } = props;
    const [swipeDirection, setSwipeDirection] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(null);
    const [swipeOutDirection, setSwipeOutDirection] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(null);
    const [mounted, setMounted] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(false);
    const [removed, setRemoved] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(false);
    const [swiping, setSwiping] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(false);
    const [swipeOut, setSwipeOut] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(false);
    const [isSwiped, setIsSwiped] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(false);
    const [offsetBeforeRemove, setOffsetBeforeRemove] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(0);
    const [initialHeight, setInitialHeight] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(0);
    const remainingTime = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(toast.duration || durationFromToaster || TOAST_LIFETIME);
    const dragStartTime = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const toastRef = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const isFront = index === 0;
    const isVisible = index + 1 <= visibleToasts;
    const toastType = toast.type;
    const dismissible = toast.dismissible !== false;
    const toastClassname = toast.className || '';
    const toastDescriptionClassname = toast.descriptionClassName || '';
    // Height index is used to calculate the offset as it gets updated before the toast array, which means we can calculate the new layout faster.
    const heightIndex = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "Toast.useMemo[heightIndex]": ()=>heights.findIndex({
                "Toast.useMemo[heightIndex]": (height)=>height.toastId === toast.id
            }["Toast.useMemo[heightIndex]"]) || 0
    }["Toast.useMemo[heightIndex]"], [
        heights,
        toast.id
    ]);
    const closeButton = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "Toast.useMemo[closeButton]": ()=>{
            var _toast_closeButton;
            return (_toast_closeButton = toast.closeButton) != null ? _toast_closeButton : closeButtonFromToaster;
        }
    }["Toast.useMemo[closeButton]"], [
        toast.closeButton,
        closeButtonFromToaster
    ]);
    const duration = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "Toast.useMemo[duration]": ()=>toast.duration || durationFromToaster || TOAST_LIFETIME
    }["Toast.useMemo[duration]"], [
        toast.duration,
        durationFromToaster
    ]);
    const closeTimerStartTimeRef = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(0);
    const offset = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(0);
    const lastCloseTimerStartTimeRef = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(0);
    const pointerStartRef = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const [y, x] = position.split('-');
    const toastsHeightBefore = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "Toast.useMemo[toastsHeightBefore]": ()=>{
            return heights.reduce({
                "Toast.useMemo[toastsHeightBefore]": (prev, curr, reducerIndex)=>{
                    // Calculate offset up until current toast
                    if (reducerIndex >= heightIndex) {
                        return prev;
                    }
                    return prev + curr.height;
                }
            }["Toast.useMemo[toastsHeightBefore]"], 0);
        }
    }["Toast.useMemo[toastsHeightBefore]"], [
        heights,
        heightIndex
    ]);
    const isDocumentHidden = useIsDocumentHidden();
    const invert = toast.invert || ToasterInvert;
    const disabled = toastType === 'loading';
    offset.current = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "Toast.useMemo": ()=>heightIndex * gap + toastsHeightBefore
    }["Toast.useMemo"], [
        heightIndex,
        toastsHeightBefore
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toast.useEffect": ()=>{
            remainingTime.current = duration;
        }
    }["Toast.useEffect"], [
        duration
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toast.useEffect": ()=>{
            // Trigger enter animation without using CSS animation
            setMounted(true);
        }
    }["Toast.useEffect"], []);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toast.useEffect": ()=>{
            const toastNode = toastRef.current;
            if (toastNode) {
                const height = toastNode.getBoundingClientRect().height;
                // Add toast height to heights array after the toast is mounted
                setInitialHeight(height);
                setHeights({
                    "Toast.useEffect": (h)=>[
                            {
                                toastId: toast.id,
                                height,
                                position: toast.position
                            },
                            ...h
                        ]
                }["Toast.useEffect"]);
                return ({
                    "Toast.useEffect": ()=>setHeights({
                            "Toast.useEffect": (h)=>h.filter({
                                    "Toast.useEffect": (height)=>height.toastId !== toast.id
                                }["Toast.useEffect"])
                        }["Toast.useEffect"])
                })["Toast.useEffect"];
            }
        }
    }["Toast.useEffect"], [
        setHeights,
        toast.id
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useLayoutEffect({
        "Toast.useLayoutEffect": ()=>{
            // Keep height up to date with the content in case it updates
            if (!mounted) return;
            const toastNode = toastRef.current;
            const originalHeight = toastNode.style.height;
            toastNode.style.height = 'auto';
            const newHeight = toastNode.getBoundingClientRect().height;
            toastNode.style.height = originalHeight;
            setInitialHeight(newHeight);
            setHeights({
                "Toast.useLayoutEffect": (heights)=>{
                    const alreadyExists = heights.find({
                        "Toast.useLayoutEffect.alreadyExists": (height)=>height.toastId === toast.id
                    }["Toast.useLayoutEffect.alreadyExists"]);
                    if (!alreadyExists) {
                        return [
                            {
                                toastId: toast.id,
                                height: newHeight,
                                position: toast.position
                            },
                            ...heights
                        ];
                    } else {
                        return heights.map({
                            "Toast.useLayoutEffect": (height)=>height.toastId === toast.id ? {
                                    ...height,
                                    height: newHeight
                                } : height
                        }["Toast.useLayoutEffect"]);
                    }
                }
            }["Toast.useLayoutEffect"]);
        }
    }["Toast.useLayoutEffect"], [
        mounted,
        toast.title,
        toast.description,
        setHeights,
        toast.id,
        toast.jsx,
        toast.action,
        toast.cancel
    ]);
    const deleteToast = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useCallback({
        "Toast.useCallback[deleteToast]": ()=>{
            // Save the offset for the exit swipe animation
            setRemoved(true);
            setOffsetBeforeRemove(offset.current);
            setHeights({
                "Toast.useCallback[deleteToast]": (h)=>h.filter({
                        "Toast.useCallback[deleteToast]": (height)=>height.toastId !== toast.id
                    }["Toast.useCallback[deleteToast]"])
            }["Toast.useCallback[deleteToast]"]);
            setTimeout({
                "Toast.useCallback[deleteToast]": ()=>{
                    removeToast(toast);
                }
            }["Toast.useCallback[deleteToast]"], TIME_BEFORE_UNMOUNT);
        }
    }["Toast.useCallback[deleteToast]"], [
        toast,
        removeToast,
        setHeights,
        offset
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toast.useEffect": ()=>{
            if (toast.promise && toastType === 'loading' || toast.duration === Infinity || toast.type === 'loading') return;
            let timeoutId;
            // Pause the timer on each hover
            const pauseTimer = {
                "Toast.useEffect.pauseTimer": ()=>{
                    if (lastCloseTimerStartTimeRef.current < closeTimerStartTimeRef.current) {
                        // Get the elapsed time since the timer started
                        const elapsedTime = new Date().getTime() - closeTimerStartTimeRef.current;
                        remainingTime.current = remainingTime.current - elapsedTime;
                    }
                    lastCloseTimerStartTimeRef.current = new Date().getTime();
                }
            }["Toast.useEffect.pauseTimer"];
            const startTimer = {
                "Toast.useEffect.startTimer": ()=>{
                    // setTimeout(, Infinity) behaves as if the delay is 0.
                    // As a result, the toast would be closed immediately, giving the appearance that it was never rendered.
                    // See: https://github.com/denysdovhan/wtfjs?tab=readme-ov-file#an-infinite-timeout
                    if (remainingTime.current === Infinity) return;
                    closeTimerStartTimeRef.current = new Date().getTime();
                    // Let the toast know it has started
                    timeoutId = setTimeout({
                        "Toast.useEffect.startTimer": ()=>{
                            toast.onAutoClose == null ? void 0 : toast.onAutoClose.call(toast, toast);
                            deleteToast();
                        }
                    }["Toast.useEffect.startTimer"], remainingTime.current);
                }
            }["Toast.useEffect.startTimer"];
            if (expanded || interacting || isDocumentHidden) {
                pauseTimer();
            } else {
                startTimer();
            }
            return ({
                "Toast.useEffect": ()=>clearTimeout(timeoutId)
            })["Toast.useEffect"];
        }
    }["Toast.useEffect"], [
        expanded,
        interacting,
        toast,
        toastType,
        isDocumentHidden,
        deleteToast
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toast.useEffect": ()=>{
            if (toast.delete) {
                deleteToast();
                toast.onDismiss == null ? void 0 : toast.onDismiss.call(toast, toast);
            }
        }
    }["Toast.useEffect"], [
        deleteToast,
        toast.delete
    ]);
    function getLoadingIcon() {
        var _toast_classNames;
        if (icons == null ? void 0 : icons.loading) {
            var _toast_classNames1;
            return /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("div", {
                className: cn(classNames == null ? void 0 : classNames.loader, toast == null ? void 0 : (_toast_classNames1 = toast.classNames) == null ? void 0 : _toast_classNames1.loader, 'sonner-loader'),
                "data-visible": toastType === 'loading'
            }, icons.loading);
        }
        return /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(Loader, {
            className: cn(classNames == null ? void 0 : classNames.loader, toast == null ? void 0 : (_toast_classNames = toast.classNames) == null ? void 0 : _toast_classNames.loader),
            visible: toastType === 'loading'
        });
    }
    const icon = toast.icon || (icons == null ? void 0 : icons[toastType]) || getAsset(toastType);
    var _toast_richColors, _icons_close;
    return /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("li", {
        tabIndex: 0,
        ref: toastRef,
        className: cn(className, toastClassname, classNames == null ? void 0 : classNames.toast, toast == null ? void 0 : (_toast_classNames = toast.classNames) == null ? void 0 : _toast_classNames.toast, classNames == null ? void 0 : classNames.default, classNames == null ? void 0 : classNames[toastType], toast == null ? void 0 : (_toast_classNames1 = toast.classNames) == null ? void 0 : _toast_classNames1[toastType]),
        "data-sonner-toast": "",
        "data-rich-colors": (_toast_richColors = toast.richColors) != null ? _toast_richColors : defaultRichColors,
        "data-styled": !Boolean(toast.jsx || toast.unstyled || unstyled),
        "data-mounted": mounted,
        "data-promise": Boolean(toast.promise),
        "data-swiped": isSwiped,
        "data-removed": removed,
        "data-visible": isVisible,
        "data-y-position": y,
        "data-x-position": x,
        "data-index": index,
        "data-front": isFront,
        "data-swiping": swiping,
        "data-dismissible": dismissible,
        "data-type": toastType,
        "data-invert": invert,
        "data-swipe-out": swipeOut,
        "data-swipe-direction": swipeOutDirection,
        "data-expanded": Boolean(expanded || expandByDefault && mounted),
        "data-testid": toast.testId,
        style: {
            '--index': index,
            '--toasts-before': index,
            '--z-index': toasts.length - index,
            '--offset': `${removed ? offsetBeforeRemove : offset.current}px`,
            '--initial-height': expandByDefault ? 'auto' : `${initialHeight}px`,
            ...style,
            ...toast.style
        },
        onDragEnd: ()=>{
            setSwiping(false);
            setSwipeDirection(null);
            pointerStartRef.current = null;
        },
        onPointerDown: (event)=>{
            if (event.button === 2) return; // Return early on right click
            if (disabled || !dismissible) return;
            dragStartTime.current = new Date();
            setOffsetBeforeRemove(offset.current);
            // Ensure we maintain correct pointer capture even when going outside of the toast (e.g. when swiping)
            event.target.setPointerCapture(event.pointerId);
            if (event.target.tagName === 'BUTTON') return;
            setSwiping(true);
            pointerStartRef.current = {
                x: event.clientX,
                y: event.clientY
            };
        },
        onPointerUp: ()=>{
            var _toastRef_current, _toastRef_current1, _dragStartTime_current;
            if (swipeOut || !dismissible) return;
            pointerStartRef.current = null;
            const swipeAmountX = Number(((_toastRef_current = toastRef.current) == null ? void 0 : _toastRef_current.style.getPropertyValue('--swipe-amount-x').replace('px', '')) || 0);
            const swipeAmountY = Number(((_toastRef_current1 = toastRef.current) == null ? void 0 : _toastRef_current1.style.getPropertyValue('--swipe-amount-y').replace('px', '')) || 0);
            const timeTaken = new Date().getTime() - ((_dragStartTime_current = dragStartTime.current) == null ? void 0 : _dragStartTime_current.getTime());
            const swipeAmount = swipeDirection === 'x' ? swipeAmountX : swipeAmountY;
            const velocity = Math.abs(swipeAmount) / timeTaken;
            if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
                setOffsetBeforeRemove(offset.current);
                toast.onDismiss == null ? void 0 : toast.onDismiss.call(toast, toast);
                if (swipeDirection === 'x') {
                    setSwipeOutDirection(swipeAmountX > 0 ? 'right' : 'left');
                } else {
                    setSwipeOutDirection(swipeAmountY > 0 ? 'down' : 'up');
                }
                deleteToast();
                setSwipeOut(true);
                return;
            } else {
                var _toastRef_current2, _toastRef_current3;
                (_toastRef_current2 = toastRef.current) == null ? void 0 : _toastRef_current2.style.setProperty('--swipe-amount-x', `0px`);
                (_toastRef_current3 = toastRef.current) == null ? void 0 : _toastRef_current3.style.setProperty('--swipe-amount-y', `0px`);
            }
            setIsSwiped(false);
            setSwiping(false);
            setSwipeDirection(null);
        },
        onPointerMove: (event)=>{
            var _window_getSelection, _toastRef_current, _toastRef_current1;
            if (!pointerStartRef.current || !dismissible) return;
            const isHighlighted = ((_window_getSelection = window.getSelection()) == null ? void 0 : _window_getSelection.toString().length) > 0;
            if (isHighlighted) return;
            const yDelta = event.clientY - pointerStartRef.current.y;
            const xDelta = event.clientX - pointerStartRef.current.x;
            var _props_swipeDirections;
            const swipeDirections = (_props_swipeDirections = props.swipeDirections) != null ? _props_swipeDirections : getDefaultSwipeDirections(position);
            // Determine swipe direction if not already locked
            if (!swipeDirection && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1)) {
                setSwipeDirection(Math.abs(xDelta) > Math.abs(yDelta) ? 'x' : 'y');
            }
            let swipeAmount = {
                x: 0,
                y: 0
            };
            const getDampening = (delta)=>{
                const factor = Math.abs(delta) / 20;
                return 1 / (1.5 + factor);
            };
            // Only apply swipe in the locked direction
            if (swipeDirection === 'y') {
                // Handle vertical swipes
                if (swipeDirections.includes('top') || swipeDirections.includes('bottom')) {
                    if (swipeDirections.includes('top') && yDelta < 0 || swipeDirections.includes('bottom') && yDelta > 0) {
                        swipeAmount.y = yDelta;
                    } else {
                        // Smoothly transition to dampened movement
                        const dampenedDelta = yDelta * getDampening(yDelta);
                        // Ensure we don't jump when transitioning to dampened movement
                        swipeAmount.y = Math.abs(dampenedDelta) < Math.abs(yDelta) ? dampenedDelta : yDelta;
                    }
                }
            } else if (swipeDirection === 'x') {
                // Handle horizontal swipes
                if (swipeDirections.includes('left') || swipeDirections.includes('right')) {
                    if (swipeDirections.includes('left') && xDelta < 0 || swipeDirections.includes('right') && xDelta > 0) {
                        swipeAmount.x = xDelta;
                    } else {
                        // Smoothly transition to dampened movement
                        const dampenedDelta = xDelta * getDampening(xDelta);
                        // Ensure we don't jump when transitioning to dampened movement
                        swipeAmount.x = Math.abs(dampenedDelta) < Math.abs(xDelta) ? dampenedDelta : xDelta;
                    }
                }
            }
            if (Math.abs(swipeAmount.x) > 0 || Math.abs(swipeAmount.y) > 0) {
                setIsSwiped(true);
            }
            (_toastRef_current = toastRef.current) == null ? void 0 : _toastRef_current.style.setProperty('--swipe-amount-x', `${swipeAmount.x}px`);
            (_toastRef_current1 = toastRef.current) == null ? void 0 : _toastRef_current1.style.setProperty('--swipe-amount-y', `${swipeAmount.y}px`);
        }
    }, closeButton && !toast.jsx && toastType !== 'loading' ? /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("button", {
        "aria-label": closeButtonAriaLabel,
        "data-disabled": disabled,
        "data-close-button": true,
        onClick: disabled || !dismissible ? ()=>{} : ()=>{
            deleteToast();
            toast.onDismiss == null ? void 0 : toast.onDismiss.call(toast, toast);
        },
        className: cn(classNames == null ? void 0 : classNames.closeButton, toast == null ? void 0 : (_toast_classNames2 = toast.classNames) == null ? void 0 : _toast_classNames2.closeButton)
    }, (_icons_close = icons == null ? void 0 : icons.close) != null ? _icons_close : CloseIcon) : null, (toastType || toast.icon || toast.promise) && toast.icon !== null && ((icons == null ? void 0 : icons[toastType]) !== null || toast.icon) ? /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("div", {
        "data-icon": "",
        className: cn(classNames == null ? void 0 : classNames.icon, toast == null ? void 0 : (_toast_classNames3 = toast.classNames) == null ? void 0 : _toast_classNames3.icon)
    }, toast.promise || toast.type === 'loading' && !toast.icon ? toast.icon || getLoadingIcon() : null, toast.type !== 'loading' ? icon : null) : null, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("div", {
        "data-content": "",
        className: cn(classNames == null ? void 0 : classNames.content, toast == null ? void 0 : (_toast_classNames4 = toast.classNames) == null ? void 0 : _toast_classNames4.content)
    }, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("div", {
        "data-title": "",
        className: cn(classNames == null ? void 0 : classNames.title, toast == null ? void 0 : (_toast_classNames5 = toast.classNames) == null ? void 0 : _toast_classNames5.title)
    }, toast.jsx ? toast.jsx : typeof toast.title === 'function' ? toast.title() : toast.title), toast.description ? /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("div", {
        "data-description": "",
        className: cn(descriptionClassName, toastDescriptionClassname, classNames == null ? void 0 : classNames.description, toast == null ? void 0 : (_toast_classNames6 = toast.classNames) == null ? void 0 : _toast_classNames6.description)
    }, typeof toast.description === 'function' ? toast.description() : toast.description) : null), /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].isValidElement(toast.cancel) ? toast.cancel : toast.cancel && isAction(toast.cancel) ? /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("button", {
        "data-button": true,
        "data-cancel": true,
        style: toast.cancelButtonStyle || cancelButtonStyle,
        onClick: (event)=>{
            // We need to check twice because typescript
            if (!isAction(toast.cancel)) return;
            if (!dismissible) return;
            toast.cancel.onClick == null ? void 0 : toast.cancel.onClick.call(toast.cancel, event);
            deleteToast();
        },
        className: cn(classNames == null ? void 0 : classNames.cancelButton, toast == null ? void 0 : (_toast_classNames7 = toast.classNames) == null ? void 0 : _toast_classNames7.cancelButton)
    }, toast.cancel.label) : null, /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].isValidElement(toast.action) ? toast.action : toast.action && isAction(toast.action) ? /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("button", {
        "data-button": true,
        "data-action": true,
        style: toast.actionButtonStyle || actionButtonStyle,
        onClick: (event)=>{
            // We need to check twice because typescript
            if (!isAction(toast.action)) return;
            toast.action.onClick == null ? void 0 : toast.action.onClick.call(toast.action, event);
            if (event.defaultPrevented) return;
            deleteToast();
        },
        className: cn(classNames == null ? void 0 : classNames.actionButton, toast == null ? void 0 : (_toast_classNames8 = toast.classNames) == null ? void 0 : _toast_classNames8.actionButton)
    }, toast.action.label) : null);
};
function getDocumentDirection() {
    if (typeof window === 'undefined') return 'ltr';
    if (typeof document === 'undefined') return 'ltr'; // For Fresh purpose
    const dirAttribute = document.documentElement.getAttribute('dir');
    if (dirAttribute === 'auto' || !dirAttribute) {
        return window.getComputedStyle(document.documentElement).direction;
    }
    return dirAttribute;
}
function assignOffset(defaultOffset, mobileOffset) {
    const styles = {};
    [
        defaultOffset,
        mobileOffset
    ].forEach((offset, index)=>{
        const isMobile = index === 1;
        const prefix = isMobile ? '--mobile-offset' : '--offset';
        const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;
        function assignAll(offset) {
            [
                'top',
                'right',
                'bottom',
                'left'
            ].forEach((key)=>{
                styles[`${prefix}-${key}`] = typeof offset === 'number' ? `${offset}px` : offset;
            });
        }
        if (typeof offset === 'number' || typeof offset === 'string') {
            assignAll(offset);
        } else if (typeof offset === 'object') {
            [
                'top',
                'right',
                'bottom',
                'left'
            ].forEach((key)=>{
                if (offset[key] === undefined) {
                    styles[`${prefix}-${key}`] = defaultValue;
                } else {
                    styles[`${prefix}-${key}`] = typeof offset[key] === 'number' ? `${offset[key]}px` : offset[key];
                }
            });
        } else {
            assignAll(defaultValue);
        }
    });
    return styles;
}
function useSonner() {
    const [activeToasts, setActiveToasts] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState([]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "useSonner.useEffect": ()=>{
            return ToastState.subscribe({
                "useSonner.useEffect": (toast)=>{
                    if (toast.dismiss) {
                        setTimeout({
                            "useSonner.useEffect": ()=>{
                                __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].flushSync({
                                    "useSonner.useEffect": ()=>{
                                        setActiveToasts({
                                            "useSonner.useEffect": (toasts)=>toasts.filter({
                                                    "useSonner.useEffect": (t)=>t.id !== toast.id
                                                }["useSonner.useEffect"])
                                        }["useSonner.useEffect"]);
                                    }
                                }["useSonner.useEffect"]);
                            }
                        }["useSonner.useEffect"]);
                        return;
                    }
                    // Prevent batching, temp solution.
                    setTimeout({
                        "useSonner.useEffect": ()=>{
                            __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].flushSync({
                                "useSonner.useEffect": ()=>{
                                    setActiveToasts({
                                        "useSonner.useEffect": (toasts)=>{
                                            const indexOfExistingToast = toasts.findIndex({
                                                "useSonner.useEffect.indexOfExistingToast": (t)=>t.id === toast.id
                                            }["useSonner.useEffect.indexOfExistingToast"]);
                                            // Update the toast if it already exists
                                            if (indexOfExistingToast !== -1) {
                                                return [
                                                    ...toasts.slice(0, indexOfExistingToast),
                                                    {
                                                        ...toasts[indexOfExistingToast],
                                                        ...toast
                                                    },
                                                    ...toasts.slice(indexOfExistingToast + 1)
                                                ];
                                            }
                                            return [
                                                toast,
                                                ...toasts
                                            ];
                                        }
                                    }["useSonner.useEffect"]);
                                }
                            }["useSonner.useEffect"]);
                        }
                    }["useSonner.useEffect"]);
                }
            }["useSonner.useEffect"]);
        }
    }["useSonner.useEffect"], []);
    return {
        toasts: activeToasts
    };
}
const Toaster = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].forwardRef(function Toaster(props, ref) {
    const { id, invert, position = 'bottom-right', hotkey = [
        'altKey',
        'KeyT'
    ], expand, closeButton, className, offset, mobileOffset, theme = 'light', richColors, duration, style, visibleToasts = VISIBLE_TOASTS_AMOUNT, toastOptions, dir = getDocumentDirection(), gap = GAP, icons, containerAriaLabel = 'Notifications' } = props;
    const [toasts, setToasts] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState([]);
    const filteredToasts = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "Toaster.Toaster.useMemo[filteredToasts]": ()=>{
            if (id) {
                return toasts.filter({
                    "Toaster.Toaster.useMemo[filteredToasts]": (toast)=>toast.toasterId === id
                }["Toaster.Toaster.useMemo[filteredToasts]"]);
            }
            return toasts.filter({
                "Toaster.Toaster.useMemo[filteredToasts]": (toast)=>!toast.toasterId
            }["Toaster.Toaster.useMemo[filteredToasts]"]);
        }
    }["Toaster.Toaster.useMemo[filteredToasts]"], [
        toasts,
        id
    ]);
    const possiblePositions = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "Toaster.Toaster.useMemo[possiblePositions]": ()=>{
            return Array.from(new Set([
                position
            ].concat(filteredToasts.filter({
                "Toaster.Toaster.useMemo[possiblePositions]": (toast)=>toast.position
            }["Toaster.Toaster.useMemo[possiblePositions]"]).map({
                "Toaster.Toaster.useMemo[possiblePositions]": (toast)=>toast.position
            }["Toaster.Toaster.useMemo[possiblePositions]"]))));
        }
    }["Toaster.Toaster.useMemo[possiblePositions]"], [
        filteredToasts,
        position
    ]);
    const [heights, setHeights] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState([]);
    const [expanded, setExpanded] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(false);
    const [interacting, setInteracting] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(false);
    const [actualTheme, setActualTheme] = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(theme !== 'system' ? theme : typeof window !== 'undefined' ? window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' : 'light');
    const listRef = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const hotkeyLabel = hotkey.join('+').replace(/Key/g, '').replace(/Digit/g, '');
    const lastFocusedElementRef = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const isFocusWithinRef = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useRef(false);
    const removeToast = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useCallback({
        "Toaster.Toaster.useCallback[removeToast]": (toastToRemove)=>{
            setToasts({
                "Toaster.Toaster.useCallback[removeToast]": (toasts)=>{
                    var _toasts_find;
                    if (!((_toasts_find = toasts.find({
                        "Toaster.Toaster.useCallback[removeToast]": (toast)=>toast.id === toastToRemove.id
                    }["Toaster.Toaster.useCallback[removeToast]"])) == null ? void 0 : _toasts_find.delete)) {
                        ToastState.dismiss(toastToRemove.id);
                    }
                    return toasts.filter({
                        "Toaster.Toaster.useCallback[removeToast]": ({ id })=>id !== toastToRemove.id
                    }["Toaster.Toaster.useCallback[removeToast]"]);
                }
            }["Toaster.Toaster.useCallback[removeToast]"]);
        }
    }["Toaster.Toaster.useCallback[removeToast]"], []);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toaster.Toaster.useEffect": ()=>{
            return ToastState.subscribe({
                "Toaster.Toaster.useEffect": (toast)=>{
                    if (toast.dismiss) {
                        // Prevent batching of other state updates
                        requestAnimationFrame({
                            "Toaster.Toaster.useEffect": ()=>{
                                setToasts({
                                    "Toaster.Toaster.useEffect": (toasts)=>toasts.map({
                                            "Toaster.Toaster.useEffect": (t)=>t.id === toast.id ? {
                                                    ...t,
                                                    delete: true
                                                } : t
                                        }["Toaster.Toaster.useEffect"])
                                }["Toaster.Toaster.useEffect"]);
                            }
                        }["Toaster.Toaster.useEffect"]);
                        return;
                    }
                    // Prevent batching, temp solution.
                    setTimeout({
                        "Toaster.Toaster.useEffect": ()=>{
                            __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2d$dom$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].flushSync({
                                "Toaster.Toaster.useEffect": ()=>{
                                    setToasts({
                                        "Toaster.Toaster.useEffect": (toasts)=>{
                                            const indexOfExistingToast = toasts.findIndex({
                                                "Toaster.Toaster.useEffect.indexOfExistingToast": (t)=>t.id === toast.id
                                            }["Toaster.Toaster.useEffect.indexOfExistingToast"]);
                                            // Update the toast if it already exists
                                            if (indexOfExistingToast !== -1) {
                                                return [
                                                    ...toasts.slice(0, indexOfExistingToast),
                                                    {
                                                        ...toasts[indexOfExistingToast],
                                                        ...toast
                                                    },
                                                    ...toasts.slice(indexOfExistingToast + 1)
                                                ];
                                            }
                                            return [
                                                toast,
                                                ...toasts
                                            ];
                                        }
                                    }["Toaster.Toaster.useEffect"]);
                                }
                            }["Toaster.Toaster.useEffect"]);
                        }
                    }["Toaster.Toaster.useEffect"]);
                }
            }["Toaster.Toaster.useEffect"]);
        }
    }["Toaster.Toaster.useEffect"], [
        toasts
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toaster.Toaster.useEffect": ()=>{
            if (theme !== 'system') {
                setActualTheme(theme);
                return;
            }
            if (theme === 'system') {
                // check if current preference is dark
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    // it's currently dark
                    setActualTheme('dark');
                } else {
                    // it's not dark
                    setActualTheme('light');
                }
            }
            if (typeof window === 'undefined') return;
            const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            try {
                // Chrome & Firefox
                darkMediaQuery.addEventListener('change', {
                    "Toaster.Toaster.useEffect": ({ matches })=>{
                        if (matches) {
                            setActualTheme('dark');
                        } else {
                            setActualTheme('light');
                        }
                    }
                }["Toaster.Toaster.useEffect"]);
            } catch (error) {
                // Safari < 14
                darkMediaQuery.addListener({
                    "Toaster.Toaster.useEffect": ({ matches })=>{
                        try {
                            if (matches) {
                                setActualTheme('dark');
                            } else {
                                setActualTheme('light');
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }["Toaster.Toaster.useEffect"]);
            }
        }
    }["Toaster.Toaster.useEffect"], [
        theme
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toaster.Toaster.useEffect": ()=>{
            // Ensure expanded is always false when no toasts are present / only one left
            if (toasts.length <= 1) {
                setExpanded(false);
            }
        }
    }["Toaster.Toaster.useEffect"], [
        toasts
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toaster.Toaster.useEffect": ()=>{
            const handleKeyDown = {
                "Toaster.Toaster.useEffect.handleKeyDown": (event)=>{
                    var _listRef_current;
                    const isHotkeyPressed = hotkey.every({
                        "Toaster.Toaster.useEffect.handleKeyDown.isHotkeyPressed": (key)=>event[key] || event.code === key
                    }["Toaster.Toaster.useEffect.handleKeyDown.isHotkeyPressed"]);
                    if (isHotkeyPressed) {
                        var _listRef_current1;
                        setExpanded(true);
                        (_listRef_current1 = listRef.current) == null ? void 0 : _listRef_current1.focus();
                    }
                    if (event.code === 'Escape' && (document.activeElement === listRef.current || ((_listRef_current = listRef.current) == null ? void 0 : _listRef_current.contains(document.activeElement)))) {
                        setExpanded(false);
                    }
                }
            }["Toaster.Toaster.useEffect.handleKeyDown"];
            document.addEventListener('keydown', handleKeyDown);
            return ({
                "Toaster.Toaster.useEffect": ()=>document.removeEventListener('keydown', handleKeyDown)
            })["Toaster.Toaster.useEffect"];
        }
    }["Toaster.Toaster.useEffect"], [
        hotkey
    ]);
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "Toaster.Toaster.useEffect": ()=>{
            if (listRef.current) {
                return ({
                    "Toaster.Toaster.useEffect": ()=>{
                        if (lastFocusedElementRef.current) {
                            lastFocusedElementRef.current.focus({
                                preventScroll: true
                            });
                            lastFocusedElementRef.current = null;
                            isFocusWithinRef.current = false;
                        }
                    }
                })["Toaster.Toaster.useEffect"];
            }
        }
    }["Toaster.Toaster.useEffect"], [
        listRef.current
    ]);
    return /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("section", {
        ref: ref,
        "aria-label": `${containerAriaLabel} ${hotkeyLabel}`,
        tabIndex: -1,
        "aria-live": "polite",
        "aria-relevant": "additions text",
        "aria-atomic": "false",
        suppressHydrationWarning: true
    }, possiblePositions.map((position, index)=>{
        var _heights_;
        const [y, x] = position.split('-');
        if (!filteredToasts.length) return null;
        return /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement("ol", {
            key: position,
            dir: dir === 'auto' ? getDocumentDirection() : dir,
            tabIndex: -1,
            ref: listRef,
            className: className,
            "data-sonner-toaster": true,
            "data-sonner-theme": actualTheme,
            "data-y-position": y,
            "data-x-position": x,
            style: {
                '--front-toast-height': `${((_heights_ = heights[0]) == null ? void 0 : _heights_.height) || 0}px`,
                '--width': `${TOAST_WIDTH}px`,
                '--gap': `${gap}px`,
                ...style,
                ...assignOffset(offset, mobileOffset)
            },
            onBlur: (event)=>{
                if (isFocusWithinRef.current && !event.currentTarget.contains(event.relatedTarget)) {
                    isFocusWithinRef.current = false;
                    if (lastFocusedElementRef.current) {
                        lastFocusedElementRef.current.focus({
                            preventScroll: true
                        });
                        lastFocusedElementRef.current = null;
                    }
                }
            },
            onFocus: (event)=>{
                const isNotDismissible = event.target instanceof HTMLElement && event.target.dataset.dismissible === 'false';
                if (isNotDismissible) return;
                if (!isFocusWithinRef.current) {
                    isFocusWithinRef.current = true;
                    lastFocusedElementRef.current = event.relatedTarget;
                }
            },
            onMouseEnter: ()=>setExpanded(true),
            onMouseMove: ()=>setExpanded(true),
            onMouseLeave: ()=>{
                // Avoid setting expanded to false when interacting with a toast, e.g. swiping
                if (!interacting) {
                    setExpanded(false);
                }
            },
            onDragEnd: ()=>setExpanded(false),
            onPointerDown: (event)=>{
                const isNotDismissible = event.target instanceof HTMLElement && event.target.dataset.dismissible === 'false';
                if (isNotDismissible) return;
                setInteracting(true);
            },
            onPointerUp: ()=>setInteracting(false)
        }, filteredToasts.filter((toast)=>!toast.position && index === 0 || toast.position === position).map((toast, index)=>{
            var _toastOptions_duration, _toastOptions_closeButton;
            return /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].createElement(Toast, {
                key: toast.id,
                icons: icons,
                index: index,
                toast: toast,
                defaultRichColors: richColors,
                duration: (_toastOptions_duration = toastOptions == null ? void 0 : toastOptions.duration) != null ? _toastOptions_duration : duration,
                className: toastOptions == null ? void 0 : toastOptions.className,
                descriptionClassName: toastOptions == null ? void 0 : toastOptions.descriptionClassName,
                invert: invert,
                visibleToasts: visibleToasts,
                closeButton: (_toastOptions_closeButton = toastOptions == null ? void 0 : toastOptions.closeButton) != null ? _toastOptions_closeButton : closeButton,
                interacting: interacting,
                position: position,
                style: toastOptions == null ? void 0 : toastOptions.style,
                unstyled: toastOptions == null ? void 0 : toastOptions.unstyled,
                classNames: toastOptions == null ? void 0 : toastOptions.classNames,
                cancelButtonStyle: toastOptions == null ? void 0 : toastOptions.cancelButtonStyle,
                actionButtonStyle: toastOptions == null ? void 0 : toastOptions.actionButtonStyle,
                closeButtonAriaLabel: toastOptions == null ? void 0 : toastOptions.closeButtonAriaLabel,
                removeToast: removeToast,
                toasts: filteredToasts.filter((t)=>t.position == toast.position),
                heights: heights.filter((h)=>h.position == toast.position),
                setHeights: setHeights,
                expandByDefault: expand,
                gap: gap,
                expanded: expanded,
                swipeDirections: props.swipeDirections
            });
        }));
    }));
});
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mergeClasses",
    ()=>mergeClasses
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const mergeClasses = (...classes)=>classes.filter((className, index, array)=>{
        return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
    }).join(" ").trim();
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "toKebabCase",
    ()=>toKebabCase
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const toKebabCase = (string)=>string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "toCamelCase",
    ()=>toCamelCase
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const toCamelCase = (string)=>string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2)=>p2 ? p2.toUpperCase() : p1.toLowerCase());
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "toPascalCase",
    ()=>toPascalCase
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$toCamelCase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.js [app-client] (ecmascript)");
;
const toPascalCase = (string)=>{
    const camelCase = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$toCamelCase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toCamelCase"])(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/defaultAttributes.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>defaultAttributes
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "hasA11yProp",
    ()=>hasA11yProp
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ const hasA11yProp = (props)=>{
    for(const prop in props){
        if (prop.startsWith("aria-") || prop === "role" || prop === "title") {
            return true;
        }
    }
    return false;
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/context.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LucideProvider",
    ()=>LucideProvider,
    "useLucideContext",
    ()=>useLucideContext
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
"use strict";
"use client";
;
const LucideContext = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({});
function LucideProvider({ children, size, color, strokeWidth, absoluteStrokeWidth, className }) {
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "LucideProvider.useMemo[value]": ()=>({
                size,
                color,
                strokeWidth,
                absoluteStrokeWidth,
                className
            })
    }["LucideProvider.useMemo[value]"], [
        size,
        color,
        strokeWidth,
        absoluteStrokeWidth,
        className
    ]);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(LucideContext.Provider, {
        value
    }, children);
}
const useLucideContext = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(LucideContext);
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/Icon.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Icon
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$defaultAttributes$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/defaultAttributes.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$hasA11yProp$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$mergeClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/context.js [app-client] (ecmascript)");
"use strict";
"use client";
;
;
;
;
;
const Icon = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref)=>{
    const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$context$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLucideContext"])() ?? {};
    const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])("svg", {
        ref,
        ...__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$defaultAttributes$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
        width: size ?? contextSize ?? __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$defaultAttributes$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].width,
        height: size ?? contextSize ?? __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$defaultAttributes$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].height,
        stroke: color ?? contextColor,
        strokeWidth: calculatedStrokeWidth,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$mergeClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mergeClasses"])("lucide", contextClass, className),
        ...!children && !(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$hasA11yProp$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasA11yProp"])(rest) && {
            "aria-hidden": "true"
        },
        ...rest
    }, [
        ...iconNode.map(([tag, attrs])=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(tag, attrs)),
        ...Array.isArray(children) ? children : [
            children
        ]
    ]);
});
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>createLucideIcon
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$mergeClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$toKebabCase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$toPascalCase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$Icon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/Icon.js [app-client] (ecmascript)");
;
;
;
;
;
const createLucideIcon = (iconName, iconNode)=>{
    const Component = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"])(({ className, ...props }, ref)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$Icon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            ref,
            iconNode,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$mergeClasses$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mergeClasses"])(`lucide-${(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$toKebabCase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toKebabCase"])((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$toPascalCase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toPascalCase"])(iconName))}`, `lucide-${iconName}`, className),
            ...props
        }));
    Component.displayName = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$shared$2f$src$2f$utils$2f$toPascalCase$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toPascalCase"])(iconName);
    return Component;
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>CircleCheck
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "circle",
        {
            cx: "12",
            cy: "12",
            r: "10",
            key: "1mglay"
        }
    ],
    [
        "path",
        {
            d: "m9 12 2 2 4-4",
            key: "dzmm74"
        }
    ]
];
const CircleCheck = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("circle-check", __iconNode);
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CircleCheckIcon>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CircleCheckIcon",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript)");
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Info
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "circle",
        {
            cx: "12",
            cy: "12",
            r: "10",
            key: "1mglay"
        }
    ],
    [
        "path",
        {
            d: "M12 16v-4",
            key: "1dtifu"
        }
    ],
    [
        "path",
        {
            d: "M12 8h.01",
            key: "e9boi3"
        }
    ]
];
const Info = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("info", __iconNode);
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript) <export default as InfoIcon>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InfoIcon",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$info$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/info.js [app-client] (ecmascript)");
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>TriangleAlert
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
            key: "wmoenq"
        }
    ],
    [
        "path",
        {
            d: "M12 9v4",
            key: "juzpu7"
        }
    ],
    [
        "path",
        {
            d: "M12 17h.01",
            key: "p32p05"
        }
    ]
];
const TriangleAlert = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("triangle-alert", __iconNode);
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as TriangleAlertIcon>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TriangleAlertIcon",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript)");
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/octagon-x.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>OctagonX
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "m15 9-6 6",
            key: "1uzhvr"
        }
    ],
    [
        "path",
        {
            d: "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z",
            key: "2d38gg"
        }
    ],
    [
        "path",
        {
            d: "m9 9 6 6",
            key: "z0biqf"
        }
    ]
];
const OctagonX = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("octagon-x", __iconNode);
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/octagon-x.js [app-client] (ecmascript) <export default as OctagonXIcon>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OctagonXIcon",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$octagon$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$octagon$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/octagon-x.js [app-client] (ecmascript)");
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>LoaderCircle
]);
/**
 * @license lucide-react v1.7.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M21 12a9 9 0 1 1-6.219-8.56",
            key: "13zald"
        }
    ]
];
const LoaderCircle = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("loader-circle", __iconNode);
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2Icon>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Loader2Icon",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript)");
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@convex-dev/better-auth/dist/react/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthBoundary",
    ()=>AuthBoundary,
    "ConvexBetterAuthProvider",
    ()=>ConvexBetterAuthProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/react/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$auth_helpers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/react/auth_helpers.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/react/ConvexAuthState.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/react/client.js [app-client] (ecmascript)");
;
;
;
function ConvexBetterAuthProvider({ children, client, authClient, initialToken }) {
    const useBetterAuth = useUseAuthFromBetterAuth(authClient, initialToken);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ConvexBetterAuthProvider.useEffect": ()=>{
            ({
                "ConvexBetterAuthProvider.useEffect": async ()=>{
                    if (typeof window === "undefined" || !window.location?.href) {
                        return;
                    }
                    const url = new URL(window.location.href);
                    const token = url.searchParams.get("ott");
                    if (token) {
                        const authClientWithCrossDomain = authClient;
                        url.searchParams.delete("ott");
                        window.history.replaceState({}, "", url);
                        const result = await authClientWithCrossDomain.crossDomain.oneTimeToken.verify({
                            token
                        });
                        const session = result.data?.session;
                        if (session) {
                            await authClient.getSession({
                                fetchOptions: {
                                    headers: {
                                        Authorization: `Bearer ${session.token}`
                                    }
                                }
                            });
                            authClientWithCrossDomain.updateSession();
                        }
                    }
                }
            })["ConvexBetterAuthProvider.useEffect"]();
        }
    }["ConvexBetterAuthProvider.useEffect"], [
        authClient
    ]);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConvexProviderWithAuth"], {
        client: client,
        useAuth: useBetterAuth,
        children: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: children
        })
    });
}
let initialTokenUsed = false;
function useUseAuthFromBetterAuth(authClient, initialToken) {
    const [cachedToken, setCachedToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialTokenUsed ? null : initialToken ?? null);
    const pendingTokenRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useUseAuthFromBetterAuth.useEffect": ()=>{
            if (!initialTokenUsed) {
                initialTokenUsed = true;
            }
        }
    }["useUseAuthFromBetterAuth.useEffect"], []);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useUseAuthFromBetterAuth.useMemo": ()=>function useAuthFromBetterAuth() {
                const { data: session, isPending: isSessionPending } = authClient.useSession();
                const sessionId = session?.session?.id;
                (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
                    "useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useEffect": ()=>{
                        if (!session && !isSessionPending && cachedToken) {
                            setCachedToken(null);
                        }
                    }
                }["useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useEffect"], [
                    session,
                    isSessionPending
                ]);
                const fetchAccessToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
                    "useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useCallback[fetchAccessToken]": async ({ forceRefreshToken = false } = {})=>{
                        if (cachedToken && !forceRefreshToken) {
                            return cachedToken;
                        }
                        if (!forceRefreshToken && pendingTokenRef.current) {
                            return pendingTokenRef.current;
                        }
                        pendingTokenRef.current = authClient.convex.token({
                            fetchOptions: {
                                throw: false
                            }
                        }).then({
                            "useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useCallback[fetchAccessToken]": ({ data })=>{
                                const token = data?.token || null;
                                setCachedToken(token);
                                return token;
                            }
                        }["useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useCallback[fetchAccessToken]"]).catch({
                            "useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useCallback[fetchAccessToken]": ()=>{
                                setCachedToken(null);
                                return null;
                            }
                        }["useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useCallback[fetchAccessToken]"]).finally({
                            "useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useCallback[fetchAccessToken]": ()=>{
                                pendingTokenRef.current = null;
                            }
                        }["useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useCallback[fetchAccessToken]"]);
                        return pendingTokenRef.current;
                    }
                }["useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useCallback[fetchAccessToken]"], // Build a new fetchAccessToken to trigger setAuth() whenever the
                // session changes.
                // eslint-disable-next-line react-hooks/exhaustive-deps
                [
                    sessionId
                ]);
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
                    "useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useMemo": ()=>({
                            isLoading: isSessionPending && !cachedToken,
                            isAuthenticated: Boolean(session?.session) || cachedToken !== null,
                            fetchAccessToken
                        })
                }["useUseAuthFromBetterAuth.useMemo.useAuthFromBetterAuth.useMemo"], // eslint-disable-next-line react-hooks/exhaustive-deps
                [
                    isSessionPending,
                    sessionId,
                    fetchAccessToken,
                    cachedToken
                ]);
            }
    }["useUseAuthFromBetterAuth.useMemo"], [
        authClient
    ]);
}
class ErrorBoundary extends __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Component"] {
    constructor(props){
        super(props);
        this.state = {};
    }
    static defaultProps = {
        renderFallback: ()=>null
    };
    static getDerivedStateFromError(error) {
        return {
            error
        };
    }
    async componentDidCatch(error) {
        if (this.props.isAuthError(error)) {
            await this.props.onUnauth();
        }
    }
    render() {
        if (this.state.error && this.props.isAuthError(this.state.error)) {
            return this.props.renderFallback?.();
        }
        return this.props.children;
    }
}
// Subscribe to the session validated user to keep this check reactive to
// actual user auth state at the provider level (rather than just jwt validity state).
const UserSubscription = ({ getAuthUserFn })=>{
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])(getAuthUserFn);
    return null;
};
const AuthBoundary = ({ children, /**
 * The function to call when the user is unauthenticated. Typically a redirect
 * to the login page.
 */ onUnauth, /**
 * The Better Auth authClient to use.
 */ authClient, /**
 * The fallback to render when the user is unauthenticated. Defaults to null.
 * Generally not rendered as error handling is typically a redirect.
 */ renderFallback, /**
 * The function to call to get the auth user.
 */ getAuthUserFn, /**
 * The function to call to check if the error is auth related.
 */ isAuthError })=>{
    const { isAuthenticated, isLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$ConvexAuthState$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useConvexAuth"])();
    const handleUnauth = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthBoundary.useCallback[handleUnauth]": async ()=>{
            // Auth request that will clear cookies if session is invalid
            await authClient.getSession();
            await onUnauth();
        }
    }["AuthBoundary.useCallback[handleUnauth]"], [
        onUnauth
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthBoundary.useEffect": ()=>{
            void ({
                "AuthBoundary.useEffect": async ()=>{
                    if (!isLoading && !isAuthenticated) {
                        await handleUnauth();
                    }
                }
            })["AuthBoundary.useEffect"]();
        }
    }["AuthBoundary.useEffect"], [
        isLoading,
        isAuthenticated
    ]);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxs"])(ErrorBoundary, {
        onUnauth: handleUnauth,
        isAuthError: isAuthError,
        renderFallback: renderFallback,
        children: [
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$auth_helpers$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Authenticated"], {
                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(UserSubscription, {
                    getAuthUserFn: getAuthUserFn
                })
            }),
            children
        ]
    });
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@convex-dev/better-auth/dist/client/plugins/index.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@convex-dev/better-auth/dist/plugins/convex/client.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "convexClient",
    ()=>convexClient
]);
const convexClient = ()=>{
    return {
        id: "convex",
        $InferServerPlugin: {}
    };
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@convex-dev/better-auth/dist/plugins/cross-domain/client.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "crossDomainClient",
    ()=>crossDomainClient,
    "getCookie",
    ()=>getCookie,
    "getSetCookie",
    ()=>getSetCookie,
    "parseSetCookieHeader",
    ()=>parseSetCookieHeader
]);
function parseSetCookieHeader(header) {
    const cookieMap = new Map();
    const cookies = header.split(", ");
    cookies.forEach((cookie)=>{
        const [nameValue, ...attributes] = cookie.split("; ");
        const [name, value] = nameValue.split("=");
        const cookieObj = {
            value
        };
        attributes.forEach((attr)=>{
            const [attrName, attrValue] = attr.split("=");
            cookieObj[attrName.toLowerCase()] = attrValue;
        });
        cookieMap.set(name, cookieObj);
    });
    return cookieMap;
}
function getSetCookie(header, prevCookie) {
    const parsed = parseSetCookieHeader(header);
    let toSetCookie = {};
    parsed.forEach((cookie, key)=>{
        const expiresAt = cookie["expires"];
        const maxAge = cookie["max-age"];
        const expires = expiresAt ? new Date(String(expiresAt)) : maxAge ? new Date(Date.now() + Number(maxAge) * 1000) : null;
        toSetCookie[key] = {
            value: cookie["value"],
            expires: expires ? expires.toISOString() : null
        };
    });
    if (prevCookie) {
        try {
            const prevCookieParsed = JSON.parse(prevCookie);
            toSetCookie = {
                ...prevCookieParsed,
                ...toSetCookie
            };
        } catch  {
        //
        }
    }
    return JSON.stringify(toSetCookie);
}
function getCookie(cookie) {
    let parsed = {};
    try {
        parsed = JSON.parse(cookie);
    } catch  {
    // noop
    }
    const toSend = Object.entries(parsed).reduce((acc, [key, value])=>{
        if (value.expires && new Date(value.expires) < new Date()) {
            return acc;
        }
        return `${acc}; ${key}=${value.value}`;
    }, "");
    return toSend;
}
const crossDomainClient = (opts = {})=>{
    let store = null;
    const cookieName = `${opts?.storagePrefix || "better-auth"}_cookie`;
    const localCacheName = `${opts?.storagePrefix || "better-auth"}_session_data`;
    const storage = opts?.storage || (typeof window !== "undefined" ? localStorage : undefined);
    return {
        id: "cross-domain",
        $InferServerPlugin: {},
        getActions (_, $store) {
            store = $store;
            return {
                /**
                 * Get the stored cookie.
                 *
                 * You can use this to get the cookie stored in the device and use it in your fetch
                 * requests.
                 *
                 * @example
                 * ```ts
                 * const cookie = client.getCookie();
                 * fetch("https://api.example.com", {
                 * 	headers: {
                 * 		cookie,
                 * 	},
                 * });
                 */ getCookie: ()=>{
                    const cookie = storage?.getItem(cookieName);
                    return getCookie(cookie || "{}");
                },
                /**
                 * Notify the session signal.
                 *
                 * This is used to trigger an update in useSession, generally when a new session
                 * token is set.
                 *
                 * @example
                 * ```ts
                 * client.notifySessionSignal();
                 * ```
                 */ updateSession: ()=>{
                    $store.notify("$sessionSignal");
                },
                /**
                 * Get the stored session data.
                 *
                 * @example
                 * ```ts
                 * const sessionData = client.getSessionData();
                 * ```
                 */ getSessionData: ()=>{
                    const sessionData = storage?.getItem(localCacheName);
                    if (!sessionData) return null;
                    try {
                        const parsed = JSON.parse(sessionData);
                        if (parsed && typeof parsed === "object" && Object.keys(parsed).length === 0) return null;
                        return parsed;
                    } catch  {
                        return null;
                    }
                }
            };
        },
        fetchPlugins: [
            {
                id: "convex",
                name: "Convex",
                hooks: {
                    async onSuccess (context) {
                        if (!storage) {
                            return;
                        }
                        const setCookie = context.response.headers.get("set-better-auth-cookie");
                        if (setCookie) {
                            const prevCookie = storage.getItem(cookieName);
                            const toSetCookie = getSetCookie(setCookie || "", prevCookie ?? undefined);
                            await storage.setItem(cookieName, toSetCookie);
                            // Only notify when the session token value actually changed.
                            // max-age recalculation with Date.now() causes the stored
                            // cookie JSON to always differ, so comparing values directly
                            // prevents infinite get-session polling loops.
                            if (setCookie.includes(".session_token=")) {
                                const parsed = parseSetCookieHeader(setCookie);
                                let prevParsed = {};
                                try {
                                    prevParsed = JSON.parse(prevCookie || "{}");
                                } catch  {
                                // noop
                                }
                                const tokenKey = [
                                    ...parsed.keys()
                                ].find((k)=>k.includes("session_token"));
                                if (tokenKey && prevParsed[tokenKey]?.value !== parsed.get(tokenKey)?.value) {
                                    store?.notify("$sessionSignal");
                                }
                            }
                        }
                        if (context.request.url.toString().includes("/get-session") && !opts?.disableCache) {
                            const data = context.data;
                            storage.setItem(localCacheName, JSON.stringify(data));
                            if (data === null) {
                                storage.setItem(cookieName, "{}");
                            }
                        }
                    }
                },
                async init (url, options) {
                    if (!storage) {
                        return {
                            url,
                            options: options
                        };
                    }
                    options = options || {};
                    const storedCookie = storage.getItem(cookieName);
                    const cookie = getCookie(storedCookie || "{}");
                    options.credentials = "omit";
                    options.headers = {
                        ...options.headers,
                        "Better-Auth-Cookie": cookie
                    };
                    if (url.includes("/sign-out")) {
                        await storage.setItem(cookieName, "{}");
                        store?.atoms.session?.set({
                            data: null,
                            error: null,
                            isPending: false
                        });
                        storage.setItem(localCacheName, "{}");
                    }
                    return {
                        url,
                        options: options
                    };
                }
            }
        ]
    };
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/timeoutManager.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TimeoutManager",
    ()=>TimeoutManager,
    "defaultTimeoutProvider",
    ()=>defaultTimeoutProvider,
    "systemSetTimeoutZero",
    ()=>systemSetTimeoutZero,
    "timeoutManager",
    ()=>timeoutManager
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// src/timeoutManager.ts
var defaultTimeoutProvider = {
    // We need the wrapper function syntax below instead of direct references to
    // global setTimeout etc.
    //
    // BAD: `setTimeout: setTimeout`
    // GOOD: `setTimeout: (cb, delay) => setTimeout(cb, delay)`
    //
    // If we use direct references here, then anything that wants to spy on or
    // replace the global setTimeout (like tests) won't work since we'll already
    // have a hard reference to the original implementation at the time when this
    // file was imported.
    setTimeout: (callback, delay)=>setTimeout(callback, delay),
    clearTimeout: (timeoutId)=>clearTimeout(timeoutId),
    setInterval: (callback, delay)=>setInterval(callback, delay),
    clearInterval: (intervalId)=>clearInterval(intervalId)
};
var TimeoutManager = class {
    // We cannot have TimeoutManager<T> as we must instantiate it with a concrete
    // type at app boot; and if we leave that type, then any new timer provider
    // would need to support the default provider's concrete timer ID, which is
    // infeasible across environments.
    //
    // We settle for type safety for the TimeoutProvider type, and accept that
    // this class is unsafe internally to allow for extension.
    #provider = defaultTimeoutProvider;
    #providerCalled = false;
    setTimeoutProvider(provider) {
        if ("TURBOPACK compile-time truthy", 1) {
            if (this.#providerCalled && provider !== this.#provider) {
                console.error(`[timeoutManager]: Switching provider after calls to previous provider might result in unexpected behavior.`, {
                    previous: this.#provider,
                    provider
                });
            }
        }
        this.#provider = provider;
        if (("TURBOPACK compile-time value", "development") !== "production") {
            this.#providerCalled = false;
        }
    }
    setTimeout(callback, delay) {
        if (("TURBOPACK compile-time value", "development") !== "production") {
            this.#providerCalled = true;
        }
        return this.#provider.setTimeout(callback, delay);
    }
    clearTimeout(timeoutId) {
        this.#provider.clearTimeout(timeoutId);
    }
    setInterval(callback, delay) {
        if (("TURBOPACK compile-time value", "development") !== "production") {
            this.#providerCalled = true;
        }
        return this.#provider.setInterval(callback, delay);
    }
    clearInterval(intervalId) {
        this.#provider.clearInterval(intervalId);
    }
};
var timeoutManager = new TimeoutManager();
function systemSetTimeoutZero(callback) {
    setTimeout(callback, 0);
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addConsumeAwareSignal",
    ()=>addConsumeAwareSignal,
    "addToEnd",
    ()=>addToEnd,
    "addToStart",
    ()=>addToStart,
    "ensureQueryFn",
    ()=>ensureQueryFn,
    "functionalUpdate",
    ()=>functionalUpdate,
    "hashKey",
    ()=>hashKey,
    "hashQueryKeyByOptions",
    ()=>hashQueryKeyByOptions,
    "isPlainArray",
    ()=>isPlainArray,
    "isPlainObject",
    ()=>isPlainObject,
    "isServer",
    ()=>isServer,
    "isValidTimeout",
    ()=>isValidTimeout,
    "keepPreviousData",
    ()=>keepPreviousData,
    "matchMutation",
    ()=>matchMutation,
    "matchQuery",
    ()=>matchQuery,
    "noop",
    ()=>noop,
    "partialMatchKey",
    ()=>partialMatchKey,
    "replaceData",
    ()=>replaceData,
    "replaceEqualDeep",
    ()=>replaceEqualDeep,
    "resolveEnabled",
    ()=>resolveEnabled,
    "resolveStaleTime",
    ()=>resolveStaleTime,
    "shallowEqualObjects",
    ()=>shallowEqualObjects,
    "shouldThrowError",
    ()=>shouldThrowError,
    "skipToken",
    ()=>skipToken,
    "sleep",
    ()=>sleep,
    "timeUntilStale",
    ()=>timeUntilStale
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// src/utils.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/timeoutManager.js [app-client] (ecmascript)");
;
var isServer = typeof window === "undefined" || "Deno" in globalThis;
function noop() {}
function functionalUpdate(updater, input) {
    return typeof updater === "function" ? updater(input) : updater;
}
function isValidTimeout(value) {
    return typeof value === "number" && value >= 0 && value !== Infinity;
}
function timeUntilStale(updatedAt, staleTime) {
    return Math.max(updatedAt + (staleTime || 0) - Date.now(), 0);
}
function resolveStaleTime(staleTime, query) {
    return typeof staleTime === "function" ? staleTime(query) : staleTime;
}
function resolveEnabled(enabled, query) {
    return typeof enabled === "function" ? enabled(query) : enabled;
}
function matchQuery(filters, query) {
    const { type = "all", exact, fetchStatus, predicate, queryKey, stale } = filters;
    if (queryKey) {
        if (exact) {
            if (query.queryHash !== hashQueryKeyByOptions(queryKey, query.options)) {
                return false;
            }
        } else if (!partialMatchKey(query.queryKey, queryKey)) {
            return false;
        }
    }
    if (type !== "all") {
        const isActive = query.isActive();
        if (type === "active" && !isActive) {
            return false;
        }
        if (type === "inactive" && isActive) {
            return false;
        }
    }
    if (typeof stale === "boolean" && query.isStale() !== stale) {
        return false;
    }
    if (fetchStatus && fetchStatus !== query.state.fetchStatus) {
        return false;
    }
    if (predicate && !predicate(query)) {
        return false;
    }
    return true;
}
function matchMutation(filters, mutation) {
    const { exact, status, predicate, mutationKey } = filters;
    if (mutationKey) {
        if (!mutation.options.mutationKey) {
            return false;
        }
        if (exact) {
            if (hashKey(mutation.options.mutationKey) !== hashKey(mutationKey)) {
                return false;
            }
        } else if (!partialMatchKey(mutation.options.mutationKey, mutationKey)) {
            return false;
        }
    }
    if (status && mutation.state.status !== status) {
        return false;
    }
    if (predicate && !predicate(mutation)) {
        return false;
    }
    return true;
}
function hashQueryKeyByOptions(queryKey, options) {
    const hashFn = options?.queryKeyHashFn || hashKey;
    return hashFn(queryKey);
}
function hashKey(queryKey) {
    return JSON.stringify(queryKey, (_, val)=>isPlainObject(val) ? Object.keys(val).sort().reduce((result, key)=>{
            result[key] = val[key];
            return result;
        }, {}) : val);
}
function partialMatchKey(a, b) {
    if (a === b) {
        return true;
    }
    if (typeof a !== typeof b) {
        return false;
    }
    if (a && b && typeof a === "object" && typeof b === "object") {
        return Object.keys(b).every((key)=>partialMatchKey(a[key], b[key]));
    }
    return false;
}
var hasOwn = Object.prototype.hasOwnProperty;
function replaceEqualDeep(a, b, depth = 0) {
    if (a === b) {
        return a;
    }
    if (depth > 500) return b;
    const array = isPlainArray(a) && isPlainArray(b);
    if (!array && !(isPlainObject(a) && isPlainObject(b))) return b;
    const aItems = array ? a : Object.keys(a);
    const aSize = aItems.length;
    const bItems = array ? b : Object.keys(b);
    const bSize = bItems.length;
    const copy = array ? new Array(bSize) : {};
    let equalItems = 0;
    for(let i = 0; i < bSize; i++){
        const key = array ? i : bItems[i];
        const aItem = a[key];
        const bItem = b[key];
        if (aItem === bItem) {
            copy[key] = aItem;
            if (array ? i < aSize : hasOwn.call(a, key)) equalItems++;
            continue;
        }
        if (aItem === null || bItem === null || typeof aItem !== "object" || typeof bItem !== "object") {
            copy[key] = bItem;
            continue;
        }
        const v = replaceEqualDeep(aItem, bItem, depth + 1);
        copy[key] = v;
        if (v === aItem) equalItems++;
    }
    return aSize === bSize && equalItems === aSize ? a : copy;
}
function shallowEqualObjects(a, b) {
    if (!b || Object.keys(a).length !== Object.keys(b).length) {
        return false;
    }
    for(const key in a){
        if (a[key] !== b[key]) {
            return false;
        }
    }
    return true;
}
function isPlainArray(value) {
    return Array.isArray(value) && value.length === Object.keys(value).length;
}
function isPlainObject(o) {
    if (!hasObjectPrototype(o)) {
        return false;
    }
    const ctor = o.constructor;
    if (ctor === void 0) {
        return true;
    }
    const prot = ctor.prototype;
    if (!hasObjectPrototype(prot)) {
        return false;
    }
    if (!prot.hasOwnProperty("isPrototypeOf")) {
        return false;
    }
    if (Object.getPrototypeOf(o) !== Object.prototype) {
        return false;
    }
    return true;
}
function hasObjectPrototype(o) {
    return Object.prototype.toString.call(o) === "[object Object]";
}
function sleep(timeout) {
    return new Promise((resolve)=>{
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeoutManager"].setTimeout(resolve, timeout);
    });
}
function replaceData(prevData, data, options) {
    if (typeof options.structuralSharing === "function") {
        return options.structuralSharing(prevData, data);
    } else if (options.structuralSharing !== false) {
        if ("TURBOPACK compile-time truthy", 1) {
            try {
                return replaceEqualDeep(prevData, data);
            } catch (error) {
                console.error(`Structural sharing requires data to be JSON serializable. To fix this, turn off structuralSharing or return JSON-serializable data from your queryFn. [${options.queryHash}]: ${error}`);
                throw error;
            }
        }
        return replaceEqualDeep(prevData, data);
    }
    return data;
}
function keepPreviousData(previousData) {
    return previousData;
}
function addToEnd(items, item, max = 0) {
    const newItems = [
        ...items,
        item
    ];
    return max && newItems.length > max ? newItems.slice(1) : newItems;
}
function addToStart(items, item, max = 0) {
    const newItems = [
        item,
        ...items
    ];
    return max && newItems.length > max ? newItems.slice(0, -1) : newItems;
}
var skipToken = /* @__PURE__ */ Symbol();
function ensureQueryFn(options, fetchOptions) {
    if ("TURBOPACK compile-time truthy", 1) {
        if (options.queryFn === skipToken) {
            console.error(`Attempted to invoke queryFn when set to skipToken. This is likely a configuration error. Query hash: '${options.queryHash}'`);
        }
    }
    if (!options.queryFn && fetchOptions?.initialPromise) {
        return ()=>fetchOptions.initialPromise;
    }
    if (!options.queryFn || options.queryFn === skipToken) {
        return ()=>Promise.reject(new Error(`Missing queryFn: '${options.queryHash}'`));
    }
    return options.queryFn;
}
function shouldThrowError(throwOnError, params) {
    if (typeof throwOnError === "function") {
        return throwOnError(...params);
    }
    return !!throwOnError;
}
function addConsumeAwareSignal(object, getSignal, onCancelled) {
    let consumed = false;
    let signal;
    Object.defineProperty(object, "signal", {
        enumerable: true,
        get: ()=>{
            signal ??= getSignal();
            if (consumed) {
                return signal;
            }
            consumed = true;
            if (signal.aborted) {
                onCancelled();
            } else {
                signal.addEventListener("abort", onCancelled, {
                    once: true
                });
            }
            return signal;
        }
    });
    return object;
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createNotifyManager",
    ()=>createNotifyManager,
    "defaultScheduler",
    ()=>defaultScheduler,
    "notifyManager",
    ()=>notifyManager
]);
// src/notifyManager.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/timeoutManager.js [app-client] (ecmascript)");
;
var defaultScheduler = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["systemSetTimeoutZero"];
function createNotifyManager() {
    let queue = [];
    let transactions = 0;
    let notifyFn = (callback)=>{
        callback();
    };
    let batchNotifyFn = (callback)=>{
        callback();
    };
    let scheduleFn = defaultScheduler;
    const schedule = (callback)=>{
        if (transactions) {
            queue.push(callback);
        } else {
            scheduleFn(()=>{
                notifyFn(callback);
            });
        }
    };
    const flush = ()=>{
        const originalQueue = queue;
        queue = [];
        if (originalQueue.length) {
            scheduleFn(()=>{
                batchNotifyFn(()=>{
                    originalQueue.forEach((callback)=>{
                        notifyFn(callback);
                    });
                });
            });
        }
    };
    return {
        batch: (callback)=>{
            let result;
            transactions++;
            try {
                result = callback();
            } finally{
                transactions--;
                if (!transactions) {
                    flush();
                }
            }
            return result;
        },
        /**
     * All calls to the wrapped function will be batched.
     */ batchCalls: (callback)=>{
            return (...args)=>{
                schedule(()=>{
                    callback(...args);
                });
            };
        },
        schedule,
        /**
     * Use this method to set a custom notify function.
     * This can be used to for example wrap notifications with `React.act` while running tests.
     */ setNotifyFunction: (fn)=>{
            notifyFn = fn;
        },
        /**
     * Use this method to set a custom function to batch notifications together into a single tick.
     * By default React Query will use the batch function provided by ReactDOM or React Native.
     */ setBatchNotifyFunction: (fn)=>{
            batchNotifyFn = fn;
        },
        setScheduler: (fn)=>{
            scheduleFn = fn;
        }
    };
}
var notifyManager = createNotifyManager();
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/subscribable.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Subscribable",
    ()=>Subscribable
]);
// src/subscribable.ts
var Subscribable = class {
    constructor(){
        this.listeners = /* @__PURE__ */ new Set();
        this.subscribe = this.subscribe.bind(this);
    }
    subscribe(listener) {
        this.listeners.add(listener);
        this.onSubscribe();
        return ()=>{
            this.listeners.delete(listener);
            this.onUnsubscribe();
        };
    }
    hasListeners() {
        return this.listeners.size > 0;
    }
    onSubscribe() {}
    onUnsubscribe() {}
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/focusManager.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FocusManager",
    ()=>FocusManager,
    "focusManager",
    ()=>focusManager
]);
// src/focusManager.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/subscribable.js [app-client] (ecmascript)");
;
var FocusManager = class extends __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    #focused;
    #cleanup;
    #setup;
    constructor(){
        super();
        this.#setup = (onFocus)=>{
            if (typeof window !== "undefined" && window.addEventListener) {
                const listener = ()=>onFocus();
                window.addEventListener("visibilitychange", listener, false);
                return ()=>{
                    window.removeEventListener("visibilitychange", listener);
                };
            }
            return;
        };
    }
    onSubscribe() {
        if (!this.#cleanup) {
            this.setEventListener(this.#setup);
        }
    }
    onUnsubscribe() {
        if (!this.hasListeners()) {
            this.#cleanup?.();
            this.#cleanup = void 0;
        }
    }
    setEventListener(setup) {
        this.#setup = setup;
        this.#cleanup?.();
        this.#cleanup = setup((focused)=>{
            if (typeof focused === "boolean") {
                this.setFocused(focused);
            } else {
                this.onFocus();
            }
        });
    }
    setFocused(focused) {
        const changed = this.#focused !== focused;
        if (changed) {
            this.#focused = focused;
            this.onFocus();
        }
    }
    onFocus() {
        const isFocused = this.isFocused();
        this.listeners.forEach((listener)=>{
            listener(isFocused);
        });
    }
    isFocused() {
        if (typeof this.#focused === "boolean") {
            return this.#focused;
        }
        return globalThis.document?.visibilityState !== "hidden";
    }
};
var focusManager = new FocusManager();
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/onlineManager.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OnlineManager",
    ()=>OnlineManager,
    "onlineManager",
    ()=>onlineManager
]);
// src/onlineManager.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/subscribable.js [app-client] (ecmascript)");
;
var OnlineManager = class extends __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    #online = true;
    #cleanup;
    #setup;
    constructor(){
        super();
        this.#setup = (onOnline)=>{
            if (typeof window !== "undefined" && window.addEventListener) {
                const onlineListener = ()=>onOnline(true);
                const offlineListener = ()=>onOnline(false);
                window.addEventListener("online", onlineListener, false);
                window.addEventListener("offline", offlineListener, false);
                return ()=>{
                    window.removeEventListener("online", onlineListener);
                    window.removeEventListener("offline", offlineListener);
                };
            }
            return;
        };
    }
    onSubscribe() {
        if (!this.#cleanup) {
            this.setEventListener(this.#setup);
        }
    }
    onUnsubscribe() {
        if (!this.hasListeners()) {
            this.#cleanup?.();
            this.#cleanup = void 0;
        }
    }
    setEventListener(setup) {
        this.#setup = setup;
        this.#cleanup?.();
        this.#cleanup = setup(this.setOnline.bind(this));
    }
    setOnline(online) {
        const changed = this.#online !== online;
        if (changed) {
            this.#online = online;
            this.listeners.forEach((listener)=>{
                listener(online);
            });
        }
    }
    isOnline() {
        return this.#online;
    }
};
var onlineManager = new OnlineManager();
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/thenable.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "pendingThenable",
    ()=>pendingThenable,
    "tryResolveSync",
    ()=>tryResolveSync
]);
// src/thenable.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
;
function pendingThenable() {
    let resolve;
    let reject;
    const thenable = new Promise((_resolve, _reject)=>{
        resolve = _resolve;
        reject = _reject;
    });
    thenable.status = "pending";
    thenable.catch(()=>{});
    function finalize(data) {
        Object.assign(thenable, data);
        delete thenable.resolve;
        delete thenable.reject;
    }
    thenable.resolve = (value)=>{
        finalize({
            status: "fulfilled",
            value
        });
        resolve(value);
    };
    thenable.reject = (reason)=>{
        finalize({
            status: "rejected",
            reason
        });
        reject(reason);
    };
    return thenable;
}
function tryResolveSync(promise) {
    let data;
    promise.then((result)=>{
        data = result;
        return result;
    }, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"])?.catch(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
    if (data !== void 0) {
        return {
            data
        };
    }
    return void 0;
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/environmentManager.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "environmentManager",
    ()=>environmentManager
]);
// src/environmentManager.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
;
var environmentManager = /* @__PURE__ */ (()=>{
    let isServerFn = ()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isServer"];
    return {
        /**
     * Returns whether the current runtime should be treated as a server environment.
     */ isServer () {
            return isServerFn();
        },
        /**
     * Overrides the server check globally.
     */ setIsServer (isServerValue) {
            isServerFn = isServerValue;
        }
    };
})();
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/retryer.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CancelledError",
    ()=>CancelledError,
    "canFetch",
    ()=>canFetch,
    "createRetryer",
    ()=>createRetryer,
    "isCancelledError",
    ()=>isCancelledError
]);
// src/retryer.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$focusManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/focusManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$onlineManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/onlineManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$thenable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/thenable.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$environmentManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/environmentManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
;
;
;
;
;
function defaultRetryDelay(failureCount) {
    return Math.min(1e3 * 2 ** failureCount, 3e4);
}
function canFetch(networkMode) {
    return (networkMode ?? "online") === "online" ? __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$onlineManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onlineManager"].isOnline() : true;
}
var CancelledError = class extends Error {
    constructor(options){
        super("CancelledError");
        this.revert = options?.revert;
        this.silent = options?.silent;
    }
};
function isCancelledError(value) {
    return value instanceof CancelledError;
}
function createRetryer(config) {
    let isRetryCancelled = false;
    let failureCount = 0;
    let continueFn;
    const thenable = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$thenable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pendingThenable"])();
    const isResolved = ()=>thenable.status !== "pending";
    const cancel = (cancelOptions)=>{
        if (!isResolved()) {
            const error = new CancelledError(cancelOptions);
            reject(error);
            config.onCancel?.(error);
        }
    };
    const cancelRetry = ()=>{
        isRetryCancelled = true;
    };
    const continueRetry = ()=>{
        isRetryCancelled = false;
    };
    const canContinue = ()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$focusManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["focusManager"].isFocused() && (config.networkMode === "always" || __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$onlineManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onlineManager"].isOnline()) && config.canRun();
    const canStart = ()=>canFetch(config.networkMode) && config.canRun();
    const resolve = (value)=>{
        if (!isResolved()) {
            continueFn?.();
            thenable.resolve(value);
        }
    };
    const reject = (value)=>{
        if (!isResolved()) {
            continueFn?.();
            thenable.reject(value);
        }
    };
    const pause = ()=>{
        return new Promise((continueResolve)=>{
            continueFn = (value)=>{
                if (isResolved() || canContinue()) {
                    continueResolve(value);
                }
            };
            config.onPause?.();
        }).then(()=>{
            continueFn = void 0;
            if (!isResolved()) {
                config.onContinue?.();
            }
        });
    };
    const run = ()=>{
        if (isResolved()) {
            return;
        }
        let promiseOrValue;
        const initialPromise = failureCount === 0 ? config.initialPromise : void 0;
        try {
            promiseOrValue = initialPromise ?? config.fn();
        } catch (error) {
            promiseOrValue = Promise.reject(error);
        }
        Promise.resolve(promiseOrValue).then(resolve).catch((error)=>{
            if (isResolved()) {
                return;
            }
            const retry = config.retry ?? (__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$environmentManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["environmentManager"].isServer() ? 0 : 3);
            const retryDelay = config.retryDelay ?? defaultRetryDelay;
            const delay = typeof retryDelay === "function" ? retryDelay(failureCount, error) : retryDelay;
            const shouldRetry = retry === true || typeof retry === "number" && failureCount < retry || typeof retry === "function" && retry(failureCount, error);
            if (isRetryCancelled || !shouldRetry) {
                reject(error);
                return;
            }
            failureCount++;
            config.onFail?.(failureCount, error);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sleep"])(delay).then(()=>{
                return canContinue() ? void 0 : pause();
            }).then(()=>{
                if (isRetryCancelled) {
                    reject(error);
                } else {
                    run();
                }
            });
        });
    };
    return {
        promise: thenable,
        status: ()=>thenable.status,
        cancel,
        continue: ()=>{
            continueFn?.();
            return thenable;
        },
        cancelRetry,
        continueRetry,
        canStart,
        start: ()=>{
            if (canStart()) {
                run();
            } else {
                pause().then(run);
            }
            return thenable;
        }
    };
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/removable.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Removable",
    ()=>Removable
]);
// src/removable.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/timeoutManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$environmentManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/environmentManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
;
;
;
var Removable = class {
    #gcTimeout;
    destroy() {
        this.clearGcTimeout();
    }
    scheduleGc() {
        this.clearGcTimeout();
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidTimeout"])(this.gcTime)) {
            this.#gcTimeout = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeoutManager"].setTimeout(()=>{
                this.optionalRemove();
            }, this.gcTime);
        }
    }
    updateGcTime(newGcTime) {
        this.gcTime = Math.max(this.gcTime || 0, newGcTime ?? (__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$environmentManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["environmentManager"].isServer() ? Infinity : 5 * 60 * 1e3));
    }
    clearGcTimeout() {
        if (this.#gcTimeout) {
            __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeoutManager"].clearTimeout(this.#gcTimeout);
            this.#gcTimeout = void 0;
        }
    }
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/query.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Query",
    ()=>Query,
    "fetchState",
    ()=>fetchState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// src/query.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$retryer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/retryer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$removable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/removable.js [app-client] (ecmascript)");
;
;
;
;
var Query = class extends __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$removable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Removable"] {
    #initialState;
    #revertState;
    #cache;
    #client;
    #retryer;
    #defaultOptions;
    #abortSignalConsumed;
    constructor(config){
        super();
        this.#abortSignalConsumed = false;
        this.#defaultOptions = config.defaultOptions;
        this.setOptions(config.options);
        this.observers = [];
        this.#client = config.client;
        this.#cache = this.#client.getQueryCache();
        this.queryKey = config.queryKey;
        this.queryHash = config.queryHash;
        this.#initialState = getDefaultState(this.options);
        this.state = config.state ?? this.#initialState;
        this.scheduleGc();
    }
    get meta() {
        return this.options.meta;
    }
    get promise() {
        return this.#retryer?.promise;
    }
    setOptions(options) {
        this.options = {
            ...this.#defaultOptions,
            ...options
        };
        this.updateGcTime(this.options.gcTime);
        if (this.state && this.state.data === void 0) {
            const defaultState = getDefaultState(this.options);
            if (defaultState.data !== void 0) {
                this.setState(successState(defaultState.data, defaultState.dataUpdatedAt));
                this.#initialState = defaultState;
            }
        }
    }
    optionalRemove() {
        if (!this.observers.length && this.state.fetchStatus === "idle") {
            this.#cache.remove(this);
        }
    }
    setData(newData, options) {
        const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["replaceData"])(this.state.data, newData, this.options);
        this.#dispatch({
            data,
            type: "success",
            dataUpdatedAt: options?.updatedAt,
            manual: options?.manual
        });
        return data;
    }
    setState(state, setStateOptions) {
        this.#dispatch({
            type: "setState",
            state,
            setStateOptions
        });
    }
    cancel(options) {
        const promise = this.#retryer?.promise;
        this.#retryer?.cancel(options);
        return promise ? promise.then(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).catch(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]) : Promise.resolve();
    }
    destroy() {
        super.destroy();
        this.cancel({
            silent: true
        });
    }
    get resetState() {
        return this.#initialState;
    }
    reset() {
        this.destroy();
        this.setState(this.resetState);
    }
    isActive() {
        return this.observers.some((observer)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(observer.options.enabled, this) !== false);
    }
    isDisabled() {
        if (this.getObserversCount() > 0) {
            return !this.isActive();
        }
        return this.options.queryFn === __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["skipToken"] || !this.isFetched();
    }
    isFetched() {
        return this.state.dataUpdateCount + this.state.errorUpdateCount > 0;
    }
    isStatic() {
        if (this.getObserversCount() > 0) {
            return this.observers.some((observer)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStaleTime"])(observer.options.staleTime, this) === "static");
        }
        return false;
    }
    isStale() {
        if (this.getObserversCount() > 0) {
            return this.observers.some((observer)=>observer.getCurrentResult().isStale);
        }
        return this.state.data === void 0 || this.state.isInvalidated;
    }
    isStaleByTime(staleTime = 0) {
        if (this.state.data === void 0) {
            return true;
        }
        if (staleTime === "static") {
            return false;
        }
        if (this.state.isInvalidated) {
            return true;
        }
        return !(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeUntilStale"])(this.state.dataUpdatedAt, staleTime);
    }
    onFocus() {
        const observer = this.observers.find((x)=>x.shouldFetchOnWindowFocus());
        observer?.refetch({
            cancelRefetch: false
        });
        this.#retryer?.continue();
    }
    onOnline() {
        const observer = this.observers.find((x)=>x.shouldFetchOnReconnect());
        observer?.refetch({
            cancelRefetch: false
        });
        this.#retryer?.continue();
    }
    addObserver(observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
            this.clearGcTimeout();
            this.#cache.notify({
                type: "observerAdded",
                query: this,
                observer
            });
        }
    }
    removeObserver(observer) {
        if (this.observers.includes(observer)) {
            this.observers = this.observers.filter((x)=>x !== observer);
            if (!this.observers.length) {
                if (this.#retryer) {
                    if (this.#abortSignalConsumed || this.#isInitialPausedFetch()) {
                        this.#retryer.cancel({
                            revert: true
                        });
                    } else {
                        this.#retryer.cancelRetry();
                    }
                }
                this.scheduleGc();
            }
            this.#cache.notify({
                type: "observerRemoved",
                query: this,
                observer
            });
        }
    }
    getObserversCount() {
        return this.observers.length;
    }
    #isInitialPausedFetch() {
        return this.state.fetchStatus === "paused" && this.state.status === "pending";
    }
    invalidate() {
        if (!this.state.isInvalidated) {
            this.#dispatch({
                type: "invalidate"
            });
        }
    }
    async fetch(options, fetchOptions) {
        if (this.state.fetchStatus !== "idle" && // If the promise in the retryer is already rejected, we have to definitely
        // re-start the fetch; there is a chance that the query is still in a
        // pending state when that happens
        this.#retryer?.status() !== "rejected") {
            if (this.state.data !== void 0 && fetchOptions?.cancelRefetch) {
                this.cancel({
                    silent: true
                });
            } else if (this.#retryer) {
                this.#retryer.continueRetry();
                return this.#retryer.promise;
            }
        }
        if (options) {
            this.setOptions(options);
        }
        if (!this.options.queryFn) {
            const observer = this.observers.find((x)=>x.options.queryFn);
            if (observer) {
                this.setOptions(observer.options);
            }
        }
        if ("TURBOPACK compile-time truthy", 1) {
            if (!Array.isArray(this.options.queryKey)) {
                console.error(`As of v4, queryKey needs to be an Array. If you are using a string like 'repoData', please change it to an Array, e.g. ['repoData']`);
            }
        }
        const abortController = new AbortController();
        const addSignalProperty = (object)=>{
            Object.defineProperty(object, "signal", {
                enumerable: true,
                get: ()=>{
                    this.#abortSignalConsumed = true;
                    return abortController.signal;
                }
            });
        };
        const fetchFn = ()=>{
            const queryFn = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ensureQueryFn"])(this.options, fetchOptions);
            const createQueryFnContext = ()=>{
                const queryFnContext2 = {
                    client: this.#client,
                    queryKey: this.queryKey,
                    meta: this.meta
                };
                addSignalProperty(queryFnContext2);
                return queryFnContext2;
            };
            const queryFnContext = createQueryFnContext();
            this.#abortSignalConsumed = false;
            if (this.options.persister) {
                return this.options.persister(queryFn, queryFnContext, this);
            }
            return queryFn(queryFnContext);
        };
        const createFetchContext = ()=>{
            const context2 = {
                fetchOptions,
                options: this.options,
                queryKey: this.queryKey,
                client: this.#client,
                state: this.state,
                fetchFn
            };
            addSignalProperty(context2);
            return context2;
        };
        const context = createFetchContext();
        this.options.behavior?.onFetch(context, this);
        this.#revertState = this.state;
        if (this.state.fetchStatus === "idle" || this.state.fetchMeta !== context.fetchOptions?.meta) {
            this.#dispatch({
                type: "fetch",
                meta: context.fetchOptions?.meta
            });
        }
        this.#retryer = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$retryer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createRetryer"])({
            initialPromise: fetchOptions?.initialPromise,
            fn: context.fetchFn,
            onCancel: (error)=>{
                if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$retryer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CancelledError"] && error.revert) {
                    this.setState({
                        ...this.#revertState,
                        fetchStatus: "idle"
                    });
                }
                abortController.abort();
            },
            onFail: (failureCount, error)=>{
                this.#dispatch({
                    type: "failed",
                    failureCount,
                    error
                });
            },
            onPause: ()=>{
                this.#dispatch({
                    type: "pause"
                });
            },
            onContinue: ()=>{
                this.#dispatch({
                    type: "continue"
                });
            },
            retry: context.options.retry,
            retryDelay: context.options.retryDelay,
            networkMode: context.options.networkMode,
            canRun: ()=>true
        });
        try {
            const data = await this.#retryer.start();
            if (data === void 0) {
                if ("TURBOPACK compile-time truthy", 1) {
                    console.error(`Query data cannot be undefined. Please make sure to return a value other than undefined from your query function. Affected query key: ${this.queryHash}`);
                }
                throw new Error(`${this.queryHash} data is undefined`);
            }
            this.setData(data);
            this.#cache.config.onSuccess?.(data, this);
            this.#cache.config.onSettled?.(data, this.state.error, this);
            return data;
        } catch (error) {
            if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$retryer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CancelledError"]) {
                if (error.silent) {
                    return this.#retryer.promise;
                } else if (error.revert) {
                    if (this.state.data === void 0) {
                        throw error;
                    }
                    return this.state.data;
                }
            }
            this.#dispatch({
                type: "error",
                error
            });
            this.#cache.config.onError?.(error, this);
            this.#cache.config.onSettled?.(this.state.data, error, this);
            throw error;
        } finally{
            this.scheduleGc();
        }
    }
    #dispatch(action) {
        const reducer = (state)=>{
            switch(action.type){
                case "failed":
                    return {
                        ...state,
                        fetchFailureCount: action.failureCount,
                        fetchFailureReason: action.error
                    };
                case "pause":
                    return {
                        ...state,
                        fetchStatus: "paused"
                    };
                case "continue":
                    return {
                        ...state,
                        fetchStatus: "fetching"
                    };
                case "fetch":
                    return {
                        ...state,
                        ...fetchState(state.data, this.options),
                        fetchMeta: action.meta ?? null
                    };
                case "success":
                    const newState = {
                        ...state,
                        ...successState(action.data, action.dataUpdatedAt),
                        dataUpdateCount: state.dataUpdateCount + 1,
                        ...!action.manual && {
                            fetchStatus: "idle",
                            fetchFailureCount: 0,
                            fetchFailureReason: null
                        }
                    };
                    this.#revertState = action.manual ? newState : void 0;
                    return newState;
                case "error":
                    const error = action.error;
                    return {
                        ...state,
                        error,
                        errorUpdateCount: state.errorUpdateCount + 1,
                        errorUpdatedAt: Date.now(),
                        fetchFailureCount: state.fetchFailureCount + 1,
                        fetchFailureReason: error,
                        fetchStatus: "idle",
                        status: "error",
                        // flag existing data as invalidated if we get a background error
                        // note that "no data" always means stale so we can set unconditionally here
                        isInvalidated: true
                    };
                case "invalidate":
                    return {
                        ...state,
                        isInvalidated: true
                    };
                case "setState":
                    return {
                        ...state,
                        ...action.state
                    };
            }
        };
        this.state = reducer(this.state);
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.observers.forEach((observer)=>{
                observer.onQueryUpdate();
            });
            this.#cache.notify({
                query: this,
                type: "updated",
                action
            });
        });
    }
};
function fetchState(data, options) {
    return {
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$retryer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["canFetch"])(options.networkMode) ? "fetching" : "paused",
        ...data === void 0 && {
            error: null,
            status: "pending"
        }
    };
}
function successState(data, dataUpdatedAt) {
    return {
        data,
        dataUpdatedAt: dataUpdatedAt ?? Date.now(),
        error: null,
        isInvalidated: false,
        status: "success"
    };
}
function getDefaultState(options) {
    const data = typeof options.initialData === "function" ? options.initialData() : options.initialData;
    const hasData = data !== void 0;
    const initialDataUpdatedAt = hasData ? typeof options.initialDataUpdatedAt === "function" ? options.initialDataUpdatedAt() : options.initialDataUpdatedAt : 0;
    return {
        data,
        dataUpdateCount: 0,
        dataUpdatedAt: hasData ? initialDataUpdatedAt ?? Date.now() : 0,
        error: null,
        errorUpdateCount: 0,
        errorUpdatedAt: 0,
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchMeta: null,
        isInvalidated: false,
        status: hasData ? "success" : "pending",
        fetchStatus: "idle"
    };
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/queryCache.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryCache",
    ()=>QueryCache
]);
// src/queryCache.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$query$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/query.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/subscribable.js [app-client] (ecmascript)");
;
;
;
;
var QueryCache = class extends __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    constructor(config = {}){
        super();
        this.config = config;
        this.#queries = /* @__PURE__ */ new Map();
    }
    #queries;
    build(client, options, state) {
        const queryKey = options.queryKey;
        const queryHash = options.queryHash ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashQueryKeyByOptions"])(queryKey, options);
        let query = this.get(queryHash);
        if (!query) {
            query = new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$query$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Query"]({
                client,
                queryKey,
                queryHash,
                options: client.defaultQueryOptions(options),
                state,
                defaultOptions: client.getQueryDefaults(queryKey)
            });
            this.add(query);
        }
        return query;
    }
    add(query) {
        if (!this.#queries.has(query.queryHash)) {
            this.#queries.set(query.queryHash, query);
            this.notify({
                type: "added",
                query
            });
        }
    }
    remove(query) {
        const queryInMap = this.#queries.get(query.queryHash);
        if (queryInMap) {
            query.destroy();
            if (queryInMap === query) {
                this.#queries.delete(query.queryHash);
            }
            this.notify({
                type: "removed",
                query
            });
        }
    }
    clear() {
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.getAll().forEach((query)=>{
                this.remove(query);
            });
        });
    }
    get(queryHash) {
        return this.#queries.get(queryHash);
    }
    getAll() {
        return [
            ...this.#queries.values()
        ];
    }
    find(filters) {
        const defaultedFilters = {
            exact: true,
            ...filters
        };
        return this.getAll().find((query)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matchQuery"])(defaultedFilters, query));
    }
    findAll(filters = {}) {
        const queries = this.getAll();
        return Object.keys(filters).length > 0 ? queries.filter((query)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matchQuery"])(filters, query)) : queries;
    }
    notify(event) {
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.listeners.forEach((listener)=>{
                listener(event);
            });
        });
    }
    onFocus() {
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.getAll().forEach((query)=>{
                query.onFocus();
            });
        });
    }
    onOnline() {
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.getAll().forEach((query)=>{
                query.onOnline();
            });
        });
    }
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/mutation.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Mutation",
    ()=>Mutation,
    "getDefaultState",
    ()=>getDefaultState
]);
// src/mutation.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$removable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/removable.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$retryer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/retryer.js [app-client] (ecmascript)");
;
;
;
var Mutation = class extends __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$removable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Removable"] {
    #client;
    #observers;
    #mutationCache;
    #retryer;
    constructor(config){
        super();
        this.#client = config.client;
        this.mutationId = config.mutationId;
        this.#mutationCache = config.mutationCache;
        this.#observers = [];
        this.state = config.state || getDefaultState();
        this.setOptions(config.options);
        this.scheduleGc();
    }
    setOptions(options) {
        this.options = options;
        this.updateGcTime(this.options.gcTime);
    }
    get meta() {
        return this.options.meta;
    }
    addObserver(observer) {
        if (!this.#observers.includes(observer)) {
            this.#observers.push(observer);
            this.clearGcTimeout();
            this.#mutationCache.notify({
                type: "observerAdded",
                mutation: this,
                observer
            });
        }
    }
    removeObserver(observer) {
        this.#observers = this.#observers.filter((x)=>x !== observer);
        this.scheduleGc();
        this.#mutationCache.notify({
            type: "observerRemoved",
            mutation: this,
            observer
        });
    }
    optionalRemove() {
        if (!this.#observers.length) {
            if (this.state.status === "pending") {
                this.scheduleGc();
            } else {
                this.#mutationCache.remove(this);
            }
        }
    }
    continue() {
        return this.#retryer?.continue() ?? // continuing a mutation assumes that variables are set, mutation must have been dehydrated before
        this.execute(this.state.variables);
    }
    async execute(variables) {
        const onContinue = ()=>{
            this.#dispatch({
                type: "continue"
            });
        };
        const mutationFnContext = {
            client: this.#client,
            meta: this.options.meta,
            mutationKey: this.options.mutationKey
        };
        this.#retryer = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$retryer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createRetryer"])({
            fn: ()=>{
                if (!this.options.mutationFn) {
                    return Promise.reject(new Error("No mutationFn found"));
                }
                return this.options.mutationFn(variables, mutationFnContext);
            },
            onFail: (failureCount, error)=>{
                this.#dispatch({
                    type: "failed",
                    failureCount,
                    error
                });
            },
            onPause: ()=>{
                this.#dispatch({
                    type: "pause"
                });
            },
            onContinue,
            retry: this.options.retry ?? 0,
            retryDelay: this.options.retryDelay,
            networkMode: this.options.networkMode,
            canRun: ()=>this.#mutationCache.canRun(this)
        });
        const restored = this.state.status === "pending";
        const isPaused = !this.#retryer.canStart();
        try {
            if (restored) {
                onContinue();
            } else {
                this.#dispatch({
                    type: "pending",
                    variables,
                    isPaused
                });
                if (this.#mutationCache.config.onMutate) {
                    await this.#mutationCache.config.onMutate(variables, this, mutationFnContext);
                }
                const context = await this.options.onMutate?.(variables, mutationFnContext);
                if (context !== this.state.context) {
                    this.#dispatch({
                        type: "pending",
                        context,
                        variables,
                        isPaused
                    });
                }
            }
            const data = await this.#retryer.start();
            await this.#mutationCache.config.onSuccess?.(data, variables, this.state.context, this, mutationFnContext);
            await this.options.onSuccess?.(data, variables, this.state.context, mutationFnContext);
            await this.#mutationCache.config.onSettled?.(data, null, this.state.variables, this.state.context, this, mutationFnContext);
            await this.options.onSettled?.(data, null, variables, this.state.context, mutationFnContext);
            this.#dispatch({
                type: "success",
                data
            });
            return data;
        } catch (error) {
            try {
                await this.#mutationCache.config.onError?.(error, variables, this.state.context, this, mutationFnContext);
            } catch (e) {
                void Promise.reject(e);
            }
            try {
                await this.options.onError?.(error, variables, this.state.context, mutationFnContext);
            } catch (e) {
                void Promise.reject(e);
            }
            try {
                await this.#mutationCache.config.onSettled?.(void 0, error, this.state.variables, this.state.context, this, mutationFnContext);
            } catch (e) {
                void Promise.reject(e);
            }
            try {
                await this.options.onSettled?.(void 0, error, variables, this.state.context, mutationFnContext);
            } catch (e) {
                void Promise.reject(e);
            }
            this.#dispatch({
                type: "error",
                error
            });
            throw error;
        } finally{
            this.#mutationCache.runNext(this);
        }
    }
    #dispatch(action) {
        const reducer = (state)=>{
            switch(action.type){
                case "failed":
                    return {
                        ...state,
                        failureCount: action.failureCount,
                        failureReason: action.error
                    };
                case "pause":
                    return {
                        ...state,
                        isPaused: true
                    };
                case "continue":
                    return {
                        ...state,
                        isPaused: false
                    };
                case "pending":
                    return {
                        ...state,
                        context: action.context,
                        data: void 0,
                        failureCount: 0,
                        failureReason: null,
                        error: null,
                        isPaused: action.isPaused,
                        status: "pending",
                        variables: action.variables,
                        submittedAt: Date.now()
                    };
                case "success":
                    return {
                        ...state,
                        data: action.data,
                        failureCount: 0,
                        failureReason: null,
                        error: null,
                        status: "success",
                        isPaused: false
                    };
                case "error":
                    return {
                        ...state,
                        data: void 0,
                        error: action.error,
                        failureCount: state.failureCount + 1,
                        failureReason: action.error,
                        isPaused: false,
                        status: "error"
                    };
            }
        };
        this.state = reducer(this.state);
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.#observers.forEach((observer)=>{
                observer.onMutationUpdate(action);
            });
            this.#mutationCache.notify({
                mutation: this,
                type: "updated",
                action
            });
        });
    }
};
function getDefaultState() {
    return {
        context: void 0,
        data: void 0,
        error: null,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: "idle",
        variables: void 0,
        submittedAt: 0
    };
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/mutationCache.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MutationCache",
    ()=>MutationCache
]);
// src/mutationCache.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$mutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/mutation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/subscribable.js [app-client] (ecmascript)");
;
;
;
;
var MutationCache = class extends __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    constructor(config = {}){
        super();
        this.config = config;
        this.#mutations = /* @__PURE__ */ new Set();
        this.#scopes = /* @__PURE__ */ new Map();
        this.#mutationId = 0;
    }
    #mutations;
    #scopes;
    #mutationId;
    build(client, options, state) {
        const mutation = new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$mutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Mutation"]({
            client,
            mutationCache: this,
            mutationId: ++this.#mutationId,
            options: client.defaultMutationOptions(options),
            state
        });
        this.add(mutation);
        return mutation;
    }
    add(mutation) {
        this.#mutations.add(mutation);
        const scope = scopeFor(mutation);
        if (typeof scope === "string") {
            const scopedMutations = this.#scopes.get(scope);
            if (scopedMutations) {
                scopedMutations.push(mutation);
            } else {
                this.#scopes.set(scope, [
                    mutation
                ]);
            }
        }
        this.notify({
            type: "added",
            mutation
        });
    }
    remove(mutation) {
        if (this.#mutations.delete(mutation)) {
            const scope = scopeFor(mutation);
            if (typeof scope === "string") {
                const scopedMutations = this.#scopes.get(scope);
                if (scopedMutations) {
                    if (scopedMutations.length > 1) {
                        const index = scopedMutations.indexOf(mutation);
                        if (index !== -1) {
                            scopedMutations.splice(index, 1);
                        }
                    } else if (scopedMutations[0] === mutation) {
                        this.#scopes.delete(scope);
                    }
                }
            }
        }
        this.notify({
            type: "removed",
            mutation
        });
    }
    canRun(mutation) {
        const scope = scopeFor(mutation);
        if (typeof scope === "string") {
            const mutationsWithSameScope = this.#scopes.get(scope);
            const firstPendingMutation = mutationsWithSameScope?.find((m)=>m.state.status === "pending");
            return !firstPendingMutation || firstPendingMutation === mutation;
        } else {
            return true;
        }
    }
    runNext(mutation) {
        const scope = scopeFor(mutation);
        if (typeof scope === "string") {
            const foundMutation = this.#scopes.get(scope)?.find((m)=>m !== mutation && m.state.isPaused);
            return foundMutation?.continue() ?? Promise.resolve();
        } else {
            return Promise.resolve();
        }
    }
    clear() {
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.#mutations.forEach((mutation)=>{
                this.notify({
                    type: "removed",
                    mutation
                });
            });
            this.#mutations.clear();
            this.#scopes.clear();
        });
    }
    getAll() {
        return Array.from(this.#mutations);
    }
    find(filters) {
        const defaultedFilters = {
            exact: true,
            ...filters
        };
        return this.getAll().find((mutation)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matchMutation"])(defaultedFilters, mutation));
    }
    findAll(filters = {}) {
        return this.getAll().filter((mutation)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["matchMutation"])(filters, mutation));
    }
    notify(event) {
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.listeners.forEach((listener)=>{
                listener(event);
            });
        });
    }
    resumePausedMutations() {
        const pausedMutations = this.getAll().filter((x)=>x.state.isPaused);
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>Promise.all(pausedMutations.map((mutation)=>mutation.continue().catch(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]))));
    }
};
function scopeFor(mutation) {
    return mutation.options.scope?.id;
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/infiniteQueryBehavior.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "hasNextPage",
    ()=>hasNextPage,
    "hasPreviousPage",
    ()=>hasPreviousPage,
    "infiniteQueryBehavior",
    ()=>infiniteQueryBehavior
]);
// src/infiniteQueryBehavior.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
;
function infiniteQueryBehavior(pages) {
    return {
        onFetch: (context, query)=>{
            const options = context.options;
            const direction = context.fetchOptions?.meta?.fetchMore?.direction;
            const oldPages = context.state.data?.pages || [];
            const oldPageParams = context.state.data?.pageParams || [];
            let result = {
                pages: [],
                pageParams: []
            };
            let currentPage = 0;
            const fetchFn = async ()=>{
                let cancelled = false;
                const addSignalProperty = (object)=>{
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addConsumeAwareSignal"])(object, ()=>context.signal, ()=>cancelled = true);
                };
                const queryFn = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ensureQueryFn"])(context.options, context.fetchOptions);
                const fetchPage = async (data, param, previous)=>{
                    if (cancelled) {
                        return Promise.reject();
                    }
                    if (param == null && data.pages.length) {
                        return Promise.resolve(data);
                    }
                    const createQueryFnContext = ()=>{
                        const queryFnContext2 = {
                            client: context.client,
                            queryKey: context.queryKey,
                            pageParam: param,
                            direction: previous ? "backward" : "forward",
                            meta: context.options.meta
                        };
                        addSignalProperty(queryFnContext2);
                        return queryFnContext2;
                    };
                    const queryFnContext = createQueryFnContext();
                    const page = await queryFn(queryFnContext);
                    const { maxPages } = context.options;
                    const addTo = previous ? __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addToStart"] : __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addToEnd"];
                    return {
                        pages: addTo(data.pages, page, maxPages),
                        pageParams: addTo(data.pageParams, param, maxPages)
                    };
                };
                if (direction && oldPages.length) {
                    const previous = direction === "backward";
                    const pageParamFn = previous ? getPreviousPageParam : getNextPageParam;
                    const oldData = {
                        pages: oldPages,
                        pageParams: oldPageParams
                    };
                    const param = pageParamFn(options, oldData);
                    result = await fetchPage(oldData, param, previous);
                } else {
                    const remainingPages = pages ?? oldPages.length;
                    do {
                        const param = currentPage === 0 ? oldPageParams[0] ?? options.initialPageParam : getNextPageParam(options, result);
                        if (currentPage > 0 && param == null) {
                            break;
                        }
                        result = await fetchPage(result, param);
                        currentPage++;
                    }while (currentPage < remainingPages)
                }
                return result;
            };
            if (context.options.persister) {
                context.fetchFn = ()=>{
                    return context.options.persister?.(fetchFn, {
                        client: context.client,
                        queryKey: context.queryKey,
                        meta: context.options.meta,
                        signal: context.signal
                    }, query);
                };
            } else {
                context.fetchFn = fetchFn;
            }
        }
    };
}
function getNextPageParam(options, { pages, pageParams }) {
    const lastIndex = pages.length - 1;
    return pages.length > 0 ? options.getNextPageParam(pages[lastIndex], pages, pageParams[lastIndex], pageParams) : void 0;
}
function getPreviousPageParam(options, { pages, pageParams }) {
    return pages.length > 0 ? options.getPreviousPageParam?.(pages[0], pages, pageParams[0], pageParams) : void 0;
}
function hasNextPage(options, data) {
    if (!data) return false;
    return getNextPageParam(options, data) != null;
}
function hasPreviousPage(options, data) {
    if (!data || !options.getPreviousPageParam) return false;
    return getPreviousPageParam(options, data) != null;
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryClient",
    ()=>QueryClient
]);
// src/queryClient.ts
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryCache$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/queryCache.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$mutationCache$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/mutationCache.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$focusManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/focusManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$onlineManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/onlineManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$infiniteQueryBehavior$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/infiniteQueryBehavior.js [app-client] (ecmascript)");
;
;
;
;
;
;
;
var QueryClient = class {
    #queryCache;
    #mutationCache;
    #defaultOptions;
    #queryDefaults;
    #mutationDefaults;
    #mountCount;
    #unsubscribeFocus;
    #unsubscribeOnline;
    constructor(config = {}){
        this.#queryCache = config.queryCache || new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryCache$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryCache"]();
        this.#mutationCache = config.mutationCache || new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$mutationCache$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MutationCache"]();
        this.#defaultOptions = config.defaultOptions || {};
        this.#queryDefaults = /* @__PURE__ */ new Map();
        this.#mutationDefaults = /* @__PURE__ */ new Map();
        this.#mountCount = 0;
    }
    mount() {
        this.#mountCount++;
        if (this.#mountCount !== 1) return;
        this.#unsubscribeFocus = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$focusManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["focusManager"].subscribe(async (focused)=>{
            if (focused) {
                await this.resumePausedMutations();
                this.#queryCache.onFocus();
            }
        });
        this.#unsubscribeOnline = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$onlineManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onlineManager"].subscribe(async (online)=>{
            if (online) {
                await this.resumePausedMutations();
                this.#queryCache.onOnline();
            }
        });
    }
    unmount() {
        this.#mountCount--;
        if (this.#mountCount !== 0) return;
        this.#unsubscribeFocus?.();
        this.#unsubscribeFocus = void 0;
        this.#unsubscribeOnline?.();
        this.#unsubscribeOnline = void 0;
    }
    isFetching(filters) {
        return this.#queryCache.findAll({
            ...filters,
            fetchStatus: "fetching"
        }).length;
    }
    isMutating(filters) {
        return this.#mutationCache.findAll({
            ...filters,
            status: "pending"
        }).length;
    }
    /**
   * Imperative (non-reactive) way to retrieve data for a QueryKey.
   * Should only be used in callbacks or functions where reading the latest data is necessary, e.g. for optimistic updates.
   *
   * Hint: Do not use this function inside a component, because it won't receive updates.
   * Use `useQuery` to create a `QueryObserver` that subscribes to changes.
   */ getQueryData(queryKey) {
        const options = this.defaultQueryOptions({
            queryKey
        });
        return this.#queryCache.get(options.queryHash)?.state.data;
    }
    ensureQueryData(options) {
        const defaultedOptions = this.defaultQueryOptions(options);
        const query = this.#queryCache.build(this, defaultedOptions);
        const cachedData = query.state.data;
        if (cachedData === void 0) {
            return this.fetchQuery(options);
        }
        if (options.revalidateIfStale && query.isStaleByTime((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStaleTime"])(defaultedOptions.staleTime, query))) {
            void this.prefetchQuery(defaultedOptions);
        }
        return Promise.resolve(cachedData);
    }
    getQueriesData(filters) {
        return this.#queryCache.findAll(filters).map(({ queryKey, state })=>{
            const data = state.data;
            return [
                queryKey,
                data
            ];
        });
    }
    setQueryData(queryKey, updater, options) {
        const defaultedOptions = this.defaultQueryOptions({
            queryKey
        });
        const query = this.#queryCache.get(defaultedOptions.queryHash);
        const prevData = query?.state.data;
        const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["functionalUpdate"])(updater, prevData);
        if (data === void 0) {
            return void 0;
        }
        return this.#queryCache.build(this, defaultedOptions).setData(data, {
            ...options,
            manual: true
        });
    }
    setQueriesData(filters, updater, options) {
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>this.#queryCache.findAll(filters).map(({ queryKey })=>[
                    queryKey,
                    this.setQueryData(queryKey, updater, options)
                ]));
    }
    getQueryState(queryKey) {
        const options = this.defaultQueryOptions({
            queryKey
        });
        return this.#queryCache.get(options.queryHash)?.state;
    }
    removeQueries(filters) {
        const queryCache = this.#queryCache;
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            queryCache.findAll(filters).forEach((query)=>{
                queryCache.remove(query);
            });
        });
    }
    resetQueries(filters, options) {
        const queryCache = this.#queryCache;
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            queryCache.findAll(filters).forEach((query)=>{
                query.reset();
            });
            return this.refetchQueries({
                type: "active",
                ...filters
            }, options);
        });
    }
    cancelQueries(filters, cancelOptions = {}) {
        const defaultedCancelOptions = {
            revert: true,
            ...cancelOptions
        };
        const promises = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>this.#queryCache.findAll(filters).map((query)=>query.cancel(defaultedCancelOptions)));
        return Promise.all(promises).then(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).catch(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
    }
    invalidateQueries(filters, options = {}) {
        return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            this.#queryCache.findAll(filters).forEach((query)=>{
                query.invalidate();
            });
            if (filters?.refetchType === "none") {
                return Promise.resolve();
            }
            return this.refetchQueries({
                ...filters,
                type: filters?.refetchType ?? filters?.type ?? "active"
            }, options);
        });
    }
    refetchQueries(filters, options = {}) {
        const fetchOptions = {
            ...options,
            cancelRefetch: options.cancelRefetch ?? true
        };
        const promises = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>this.#queryCache.findAll(filters).filter((query)=>!query.isDisabled() && !query.isStatic()).map((query)=>{
                let promise = query.fetch(void 0, fetchOptions);
                if (!fetchOptions.throwOnError) {
                    promise = promise.catch(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
                }
                return query.state.fetchStatus === "paused" ? Promise.resolve() : promise;
            }));
        return Promise.all(promises).then(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
    }
    fetchQuery(options) {
        const defaultedOptions = this.defaultQueryOptions(options);
        if (defaultedOptions.retry === void 0) {
            defaultedOptions.retry = false;
        }
        const query = this.#queryCache.build(this, defaultedOptions);
        return query.isStaleByTime((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStaleTime"])(defaultedOptions.staleTime, query)) ? query.fetch(defaultedOptions) : Promise.resolve(query.state.data);
    }
    prefetchQuery(options) {
        return this.fetchQuery(options).then(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).catch(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
    }
    fetchInfiniteQuery(options) {
        options.behavior = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$infiniteQueryBehavior$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["infiniteQueryBehavior"])(options.pages);
        return this.fetchQuery(options);
    }
    prefetchInfiniteQuery(options) {
        return this.fetchInfiniteQuery(options).then(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).catch(__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
    }
    ensureInfiniteQueryData(options) {
        options.behavior = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$infiniteQueryBehavior$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["infiniteQueryBehavior"])(options.pages);
        return this.ensureQueryData(options);
    }
    resumePausedMutations() {
        if (__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$onlineManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onlineManager"].isOnline()) {
            return this.#mutationCache.resumePausedMutations();
        }
        return Promise.resolve();
    }
    getQueryCache() {
        return this.#queryCache;
    }
    getMutationCache() {
        return this.#mutationCache;
    }
    getDefaultOptions() {
        return this.#defaultOptions;
    }
    setDefaultOptions(options) {
        this.#defaultOptions = options;
    }
    setQueryDefaults(queryKey, options) {
        this.#queryDefaults.set((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashKey"])(queryKey), {
            queryKey,
            defaultOptions: options
        });
    }
    getQueryDefaults(queryKey) {
        const defaults = [
            ...this.#queryDefaults.values()
        ];
        const result = {};
        defaults.forEach((queryDefault)=>{
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["partialMatchKey"])(queryKey, queryDefault.queryKey)) {
                Object.assign(result, queryDefault.defaultOptions);
            }
        });
        return result;
    }
    setMutationDefaults(mutationKey, options) {
        this.#mutationDefaults.set((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashKey"])(mutationKey), {
            mutationKey,
            defaultOptions: options
        });
    }
    getMutationDefaults(mutationKey) {
        const defaults = [
            ...this.#mutationDefaults.values()
        ];
        const result = {};
        defaults.forEach((queryDefault)=>{
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["partialMatchKey"])(mutationKey, queryDefault.mutationKey)) {
                Object.assign(result, queryDefault.defaultOptions);
            }
        });
        return result;
    }
    defaultQueryOptions(options) {
        if (options._defaulted) {
            return options;
        }
        const defaultedOptions = {
            ...this.#defaultOptions.queries,
            ...this.getQueryDefaults(options.queryKey),
            ...options,
            _defaulted: true
        };
        if (!defaultedOptions.queryHash) {
            defaultedOptions.queryHash = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashQueryKeyByOptions"])(defaultedOptions.queryKey, defaultedOptions);
        }
        if (defaultedOptions.refetchOnReconnect === void 0) {
            defaultedOptions.refetchOnReconnect = defaultedOptions.networkMode !== "always";
        }
        if (defaultedOptions.throwOnError === void 0) {
            defaultedOptions.throwOnError = !!defaultedOptions.suspense;
        }
        if (!defaultedOptions.networkMode && defaultedOptions.persister) {
            defaultedOptions.networkMode = "offlineFirst";
        }
        if (defaultedOptions.queryFn === __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["skipToken"]) {
            defaultedOptions.enabled = false;
        }
        return defaultedOptions;
    }
    defaultMutationOptions(options) {
        if (options?._defaulted) {
            return options;
        }
        return {
            ...this.#defaultOptions.mutations,
            ...options?.mutationKey && this.getMutationDefaults(options.mutationKey),
            ...options,
            _defaulted: true
        };
    }
    clear() {
        this.#queryCache.clear();
        this.#mutationCache.clear();
    }
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@convex-dev/react-query/dist/esm/index.js [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ConvexQueryClient",
    ()=>ConvexQueryClient,
    "convexAction",
    ()=>convexAction,
    "convexQuery",
    ()=>convexQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/browser/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$http_client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/browser/http_client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/react/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/react/client.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/server/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/server/api.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/values/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/convex/dist/esm/values/value.js [app-client] (ecmascript)");
;
;
;
;
;
;
const isServer = typeof window === "undefined";
function isConvexSkipped(queryKey) {
    return queryKey.length >= 2 && [
        "convexQuery",
        "convexAction"
    ].includes(queryKey[0]) && queryKey[2] === "skip";
}
function isConvexQuery(queryKey) {
    return queryKey.length >= 2 && queryKey[0] === "convexQuery";
}
function isConvexAction(queryKey) {
    return queryKey.length >= 2 && queryKey[0] === "convexAction";
}
function hash(queryKey) {
    return `convexQuery|${(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFunctionName"])(queryKey[1])}|${JSON.stringify((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$values$2f$value$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convexToJson"])(queryKey[2]))}`;
}
class ConvexQueryClient {
    convexClient;
    subscriptions;
    unsubscribe;
    // Only exists during SSR
    serverHttpClient;
    _queryClient;
    ssrQueryMode;
    get queryClient() {
        if (!this._queryClient) {
            throw new Error("ConvexQueryClient not connected to TanStack QueryClient.");
        }
        return this._queryClient;
    }
    constructor(/** A ConvexReactClient instance or a URL to use to instantiate one. */ client, /** Options mostly for the ConvexReactClient to be constructed. */ options = {}){
        if (typeof client === "string") {
            this.convexClient = new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$react$2f$client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConvexReactClient"](client, options);
        } else {
            this.convexClient = client;
        }
        if (options.dangerouslyUseInconsistentQueriesDuringSSR) {
            this.ssrQueryMode = "inconsistent";
        } else {
            this.ssrQueryMode = "consistent";
        }
        this.subscriptions = {};
        if (options.queryClient) {
            this._queryClient = options.queryClient;
            this.unsubscribe = this.subscribeInner(options.queryClient.getQueryCache());
        }
        if (isServer) {
            this.serverHttpClient = new __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$browser$2f$http_client$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ConvexHttpClient"](this.convexClient.url);
        }
    }
    /** Complete initialization of ConvexQueryClient by connecting a TanStack QueryClient */ connect(queryClient) {
        if (this.unsubscribe) {
            throw new Error("already subscribed!");
        }
        this._queryClient = queryClient;
        this.unsubscribe = this.subscribeInner(queryClient.getQueryCache());
    }
    /** Update every query key. Probably not useful, don't use this. */ onUpdate = ()=>{
        // Fortunately this does not reset the gc time.
        __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            for (const key of Object.keys(this.subscriptions)){
                this.onUpdateQueryKeyHash(key);
            }
        });
    };
    onUpdateQueryKeyHash(queryHash) {
        const subscription = this.subscriptions[queryHash];
        if (!subscription) {
            // If we have no record of this subscription that should be a logic error.
            throw new Error(`Internal ConvexQueryClient error: onUpdateQueryKeyHash called for ${queryHash}`);
        }
        const queryCache = this.queryClient.getQueryCache();
        const query = queryCache.get(queryHash);
        if (!query) return;
        const { queryKey, watch } = subscription;
        let result;
        try {
            result = {
                ok: true,
                value: watch.localQueryResult()
            };
        } catch (error) {
            result = {
                ok: false,
                error
            };
        }
        if (result.ok) {
            const value = result.value;
            this.queryClient.setQueryData(queryKey, (prev)=>{
                if (prev === undefined) {
                    // If `prev` is undefined there is no react-query entry for this query key.
                    // Return `undefined` to signal not to create one.
                    return undefined;
                }
                return value;
            });
        } else {
            const { error } = result;
            // TODO This may not be a stable API. Devtools work this way so it's at
            // least used elsewhere. Either trigger a query by invalidating this query
            // (only feasible if guaranteed to update before the next tick) or
            // look into a `QueryClient.setQueryError` API.
            query?.setState({
                error: error,
                errorUpdateCount: query.state.errorUpdateCount + 1,
                errorUpdatedAt: Date.now(),
                fetchFailureCount: query.state.fetchFailureCount + 1,
                fetchFailureReason: error,
                fetchStatus: "idle",
                status: "error"
            }, {
                meta: "set by ConvexQueryClient"
            });
        }
    }
    subscribeInner(queryCache) {
        if (isServer) return ()=>{};
        return queryCache.subscribe((event)=>{
            if (!isConvexQuery(event.query.queryKey)) {
                return;
            }
            if (isConvexSkipped(event.query.queryKey)) {
                return;
            }
            switch(event.type){
                // A query has been GC'd so no stale value will be available.
                // In Convex this means we should unsubscribe.
                case "removed":
                    {
                        this.subscriptions[event.query.queryHash].unsubscribe();
                        delete this.subscriptions[event.query.queryHash];
                        break;
                    }
                // A query has been requested for the first time.
                // Subscribe to the query so we hold on to it.
                case "added":
                    {
                        // There exists only one watch per subscription; but
                        // watches are stateless anyway, they're just util code.
                        const [_, func, args, _opts] = event.query.queryKey;
                        const watch = this.convexClient.watchQuery(func, args, // TODO pass journals through
                        {});
                        const unsubscribe = watch.onUpdate(()=>{
                            this.onUpdateQueryKeyHash(event.query.queryHash);
                        });
                        this.subscriptions[event.query.queryHash] = {
                            queryKey: event.query.queryKey,
                            watch,
                            unsubscribe
                        };
                        break;
                    }
                // Runs when a useQuery mounts
                case "observerAdded":
                    {
                        break;
                    }
                // Runs when a useQuery unmounts
                case "observerRemoved":
                    {
                        if (event.query.getObserversCount() === 0) {
                        // The last useQuery subscribed to this query has unmounted.
                        // But don't clean up yet, after gcTime a "removed" event
                        // will notify that it's time to drop the subscription to
                        // the Convex backend.
                        }
                        break;
                    }
                // Fires once per useQuery hook
                case "observerResultsUpdated":
                    {
                        break;
                    }
                case "updated":
                    {
                        if (event.action.type === "setState" && event.action.setStateOptions?.meta === "set by ConvexQueryClient") {
                            break;
                        }
                        break;
                    }
                case "observerOptionsUpdated":
                    {
                        break;
                    }
            }
        });
    }
    /**
     * Returns a promise for the query result of a query key containing
     * `['convexQuery', FunctionReference, args]` and subscribes via WebSocket
     * to future updates.
     *
     * You can provide a custom fetch function for queries that are not
     * Convex queries.
     */ queryFn(otherFetch = throwBecauseNotConvexQuery) {
        return async (context)=>{
            if (isConvexSkipped(context.queryKey)) {
                throw new Error("Skipped query should not actually be run, should { enabled: false }");
            }
            // Only queries can be requested consistently (at a previous timestamp),
            // actions and mutations run at the latest timestamp.
            if (isConvexQuery(context.queryKey)) {
                const [_, func, args] = context.queryKey;
                if (isServer) {
                    if (this.ssrQueryMode === "consistent") {
                        return await this.serverHttpClient.consistentQuery(func, args);
                    } else {
                        return await this.serverHttpClient.query(func, args);
                    }
                } else {
                    return await this.convexClient.query(func, args);
                }
            }
            if (isConvexAction(context.queryKey)) {
                const [_, func, args] = context.queryKey;
                if (isServer) {
                    return await this.serverHttpClient.action(func, args);
                } else {
                    return await this.convexClient.action(func, args);
                }
            }
            return otherFetch(context);
        };
    }
    /**
     * Set this globally to use Convex query functions.
     *
     * ```ts
     * const queryClient = new QueryClient({
     *   defaultOptions: {
     *    queries: {
     *       queryKeyHashFn: convexQueryClient.hashFn(),
     *     },
     *   },
     * });
     *
     * You can provide a custom hash function for keys that are not for Convex
     * queries.
     */ hashFn(otherHashKey = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashKey"]) {
        return (queryKey)=>{
            if (isConvexQuery(queryKey)) {
                return hash(queryKey);
            }
            return otherHashKey(queryKey);
        };
    }
    /**
     * Query options factory for Convex query function subscriptions.
     *
     * ```
     * useQuery(client.queryOptions(api.foo.bar, args))
     * ```
     *
     * If you need to specify other options spread it:
     * ```
     * useQuery({
     *   ...convexQueryClient.queryOptions(api.foo.bar, args),
     *   placeholderData: { name: "me" }
     * });
     * ```
     */ queryOptions = (funcRef, queryArgs)=>{
        return {
            queryKey: [
                "convexQuery",
                // Make query key serializable
                (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFunctionName"])(funcRef),
                // TODO bigints are not serializable
                queryArgs
            ],
            queryFn: this.queryFn(),
            staleTime: Infinity
        };
    };
}
function convexQuery(funcRef, ...argsOrSkip) {
    const queryArgs = argsOrSkip[0];
    const finalArgs = queryArgs ?? {};
    return {
        queryKey: [
            "convexQuery",
            // Make query key serializable
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFunctionName"])(funcRef),
            // TODO bigints are not serializable
            finalArgs === "skip" ? "skip" : finalArgs
        ],
        staleTime: Infinity,
        ...finalArgs === "skip" ? {
            enabled: false
        } : {}
    };
}
function convexAction(funcRef, ...argsOrSkip) {
    const args = argsOrSkip[0];
    const finalArgs = args ?? {};
    return {
        queryKey: [
            "convexAction",
            // Make query key serializable
            (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$convex$2f$dist$2f$esm$2f$server$2f$api$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFunctionName"])(funcRef),
            // TODO bigints are not serializable
            finalArgs === "skip" ? {} : finalArgs
        ],
        staleTime: Infinity,
        ...finalArgs === "skip" ? {
            enabled: false
        } : {}
    };
}
function throwBecauseNotConvexQuery(context) {
    throw new Error("Query key is not for a Convex Query: " + context.queryKey);
}
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryClientContext",
    ()=>QueryClientContext,
    "QueryClientProvider",
    ()=>QueryClientProvider,
    "useQueryClient",
    ()=>useQueryClient
]);
// src/QueryClientProvider.tsx
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
"use client";
;
;
var QueryClientContext = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](void 0);
var useQueryClient = (queryClient)=>{
    const client = __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](QueryClientContext);
    if (queryClient) {
        return queryClient;
    }
    if (!client) {
        throw new Error("No QueryClient set, use QueryClientProvider to set one");
    }
    return client;
};
var QueryClientProvider = ({ client, children })=>{
    __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "QueryClientProvider.useEffect": ()=>{
            client.mount();
            return ({
                "QueryClientProvider.useEffect": ()=>{
                    client.unmount();
                }
            })["QueryClientProvider.useEffect"];
        }
    }["QueryClientProvider.useEffect"], [
        client
    ]);
    return /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(QueryClientContext.Provider, {
        value: client,
        children
    });
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/utils/error-codes.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "defineErrorCodes",
    ()=>defineErrorCodes
]);
//#region src/utils/error-codes.ts
function defineErrorCodes(codes) {
    return Object.fromEntries(Object.entries(codes).map(([key, value])=>[
            key,
            {
                code: key,
                message: value,
                toString: ()=>key
            }
        ]));
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/error/codes.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BASE_ERROR_CODES",
    ()=>BASE_ERROR_CODES
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$utils$2f$error$2d$codes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/utils/error-codes.mjs [app-client] (ecmascript)");
;
//#region src/error/codes.ts
const BASE_ERROR_CODES = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$utils$2f$error$2d$codes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["defineErrorCodes"])({
    USER_NOT_FOUND: "User not found",
    FAILED_TO_CREATE_USER: "Failed to create user",
    FAILED_TO_CREATE_SESSION: "Failed to create session",
    FAILED_TO_UPDATE_USER: "Failed to update user",
    FAILED_TO_GET_SESSION: "Failed to get session",
    INVALID_PASSWORD: "Invalid password",
    INVALID_EMAIL: "Invalid email",
    INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
    INVALID_USER: "Invalid user",
    SOCIAL_ACCOUNT_ALREADY_LINKED: "Social account already linked",
    PROVIDER_NOT_FOUND: "Provider not found",
    INVALID_TOKEN: "Invalid token",
    TOKEN_EXPIRED: "Token expired",
    ID_TOKEN_NOT_SUPPORTED: "id_token not supported",
    FAILED_TO_GET_USER_INFO: "Failed to get user info",
    USER_EMAIL_NOT_FOUND: "User email not found",
    EMAIL_NOT_VERIFIED: "Email not verified",
    PASSWORD_TOO_SHORT: "Password too short",
    PASSWORD_TOO_LONG: "Password too long",
    USER_ALREADY_EXISTS: "User already exists.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "User already exists. Use another email.",
    EMAIL_CAN_NOT_BE_UPDATED: "Email can not be updated",
    CREDENTIAL_ACCOUNT_NOT_FOUND: "Credential account not found",
    SESSION_EXPIRED: "Session expired. Re-authenticate to perform this action.",
    FAILED_TO_UNLINK_LAST_ACCOUNT: "You can't unlink your last account",
    ACCOUNT_NOT_FOUND: "Account not found",
    USER_ALREADY_HAS_PASSWORD: "User already has a password. Provide that to delete the account.",
    CROSS_SITE_NAVIGATION_LOGIN_BLOCKED: "Cross-site navigation login blocked. This request appears to be a CSRF attack.",
    VERIFICATION_EMAIL_NOT_ENABLED: "Verification email isn't enabled",
    EMAIL_ALREADY_VERIFIED: "Email is already verified",
    EMAIL_MISMATCH: "Email mismatch",
    SESSION_NOT_FRESH: "Session is not fresh",
    LINKED_ACCOUNT_ALREADY_EXISTS: "Linked account already exists",
    INVALID_ORIGIN: "Invalid origin",
    INVALID_CALLBACK_URL: "Invalid callbackURL",
    INVALID_REDIRECT_URL: "Invalid redirectURL",
    INVALID_ERROR_CALLBACK_URL: "Invalid errorCallbackURL",
    INVALID_NEW_USER_CALLBACK_URL: "Invalid newUserCallbackURL",
    MISSING_OR_NULL_ORIGIN: "Missing or null Origin",
    CALLBACK_URL_REQUIRED: "callbackURL is required",
    FAILED_TO_CREATE_VERIFICATION: "Unable to create verification",
    FIELD_NOT_ALLOWED: "Field not allowed to be set",
    ASYNC_VALIDATION_NOT_SUPPORTED: "Async validation is not supported",
    VALIDATION_ERROR: "Validation Error",
    MISSING_FIELD: "Field is required",
    METHOD_NOT_ALLOWED_DEFER_SESSION_REQUIRED: "POST method requires deferSessionRefresh to be enabled in session config",
    BODY_MUST_BE_AN_OBJECT: "Body must be an object",
    PASSWORD_ALREADY_SET: "User already has a password set"
});
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/error/index.mjs [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "APIError",
    ()=>APIError,
    "BetterAuthError",
    ()=>BetterAuthError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$error$2f$codes$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/error/codes.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$better$2d$call$2f$dist$2f$error$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/better-call/dist/error.mjs [app-client] (ecmascript)");
;
;
//#region src/error/index.ts
var BetterAuthError = class extends Error {
    constructor(message, options){
        super(message, options);
        this.name = "BetterAuthError";
        this.message = message;
        this.stack = "";
    }
};
var APIError = class APIError extends __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$better$2d$call$2f$dist$2f$error$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["APIError"] {
    constructor(...args){
        super(...args);
    }
    static fromStatus(status, body) {
        return new APIError(status, body);
    }
    static from(status, error) {
        return new APIError(status, {
            message: error.message,
            code: error.code
        });
    }
};
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/env-impl.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ENV",
    ()=>ENV,
    "env",
    ()=>env,
    "getBooleanEnvVar",
    ()=>getBooleanEnvVar,
    "getEnvVar",
    ()=>getEnvVar,
    "isDevelopment",
    ()=>isDevelopment,
    "isProduction",
    ()=>isProduction,
    "isTest",
    ()=>isTest,
    "nodeENV",
    ()=>nodeENV
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
//#region src/env/env-impl.ts
const _envShim = Object.create(null);
const _getEnv = (useShim)=>globalThis.process?.env || globalThis.Deno?.env.toObject() || globalThis.__env__ || (useShim ? _envShim : globalThis);
const env = new Proxy(_envShim, {
    get (_, prop) {
        return _getEnv()[prop] ?? _envShim[prop];
    },
    has (_, prop) {
        return prop in _getEnv() || prop in _envShim;
    },
    set (_, prop, value) {
        const env = _getEnv(true);
        env[prop] = value;
        return true;
    },
    deleteProperty (_, prop) {
        if (!prop) return false;
        const env = _getEnv(true);
        delete env[prop];
        return true;
    },
    ownKeys () {
        const env = _getEnv(true);
        return Object.keys(env);
    }
});
function toBoolean(val) {
    return val ? val !== "false" : false;
}
const nodeENV = typeof __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"] !== "undefined" && __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env && ("TURBOPACK compile-time value", "development") || "";
/** Detect if `NODE_ENV` environment variable is `production` */ const isProduction = nodeENV === "production";
/** Detect if `NODE_ENV` environment variable is `dev` or `development` */ const isDevelopment = ()=>nodeENV === "dev" || nodeENV === "development";
/** Detect if `NODE_ENV` environment variable is `test` */ const isTest = ()=>nodeENV === "test" || toBoolean(env.TEST);
/**
* Get environment variable with fallback
*/ function getEnvVar(key, fallback) {
    if (typeof __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"] !== "undefined" && __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env) return __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env[key] ?? fallback;
    if (typeof Deno !== "undefined") return Deno.env.get(key) ?? fallback;
    if (typeof Bun !== "undefined") return Bun.env[key] ?? fallback;
    return fallback;
}
/**
* Get boolean environment variable
*/ function getBooleanEnvVar(key, fallback = true) {
    const value = getEnvVar(key);
    if (!value) return fallback;
    return value !== "0" && value.toLowerCase() !== "false" && value !== "";
}
/**
* Common environment variables used in Better Auth
*/ const ENV = Object.freeze({
    get BETTER_AUTH_SECRET () {
        return getEnvVar("BETTER_AUTH_SECRET");
    },
    get AUTH_SECRET () {
        return getEnvVar("AUTH_SECRET");
    },
    get BETTER_AUTH_TELEMETRY () {
        return getEnvVar("BETTER_AUTH_TELEMETRY");
    },
    get BETTER_AUTH_TELEMETRY_ID () {
        return getEnvVar("BETTER_AUTH_TELEMETRY_ID");
    },
    get NODE_ENV () {
        return getEnvVar("NODE_ENV", "development");
    },
    get PACKAGE_VERSION () {
        return getEnvVar("PACKAGE_VERSION", "0.0.0");
    },
    get BETTER_AUTH_TELEMETRY_ENDPOINT () {
        return getEnvVar("BETTER_AUTH_TELEMETRY_ENDPOINT", "");
    }
});
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/color-depth.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getColorDepth",
    ()=>getColorDepth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/env-impl.mjs [app-client] (ecmascript)");
;
//#region src/env/color-depth.ts
const COLORS_2 = 1;
const COLORS_16 = 4;
const COLORS_256 = 8;
const COLORS_16m = 24;
const TERM_ENVS = {
    eterm: COLORS_16,
    cons25: COLORS_16,
    console: COLORS_16,
    cygwin: COLORS_16,
    dtterm: COLORS_16,
    gnome: COLORS_16,
    hurd: COLORS_16,
    jfbterm: COLORS_16,
    konsole: COLORS_16,
    kterm: COLORS_16,
    mlterm: COLORS_16,
    mosh: COLORS_16m,
    putty: COLORS_16,
    st: COLORS_16,
    "rxvt-unicode-24bit": COLORS_16m,
    terminator: COLORS_16m,
    "xterm-kitty": COLORS_16m
};
const CI_ENVS_MAP = new Map(Object.entries({
    APPVEYOR: COLORS_256,
    BUILDKITE: COLORS_256,
    CIRCLECI: COLORS_16m,
    DRONE: COLORS_256,
    GITEA_ACTIONS: COLORS_16m,
    GITHUB_ACTIONS: COLORS_16m,
    GITLAB_CI: COLORS_256,
    TRAVIS: COLORS_256
}));
const TERM_ENVS_REG_EXP = [
    /ansi/,
    /color/,
    /linux/,
    /direct/,
    /^con[0-9]*x[0-9]/,
    /^rxvt/,
    /^screen/,
    /^xterm/,
    /^vt100/,
    /^vt220/
];
function getColorDepth() {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("FORCE_COLOR") !== void 0) switch((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("FORCE_COLOR")){
        case "":
        case "1":
        case "true":
            return COLORS_16;
        case "2":
            return COLORS_256;
        case "3":
            return COLORS_16m;
        default:
            return COLORS_2;
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("NODE_DISABLE_COLORS") !== void 0 && (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("NODE_DISABLE_COLORS") !== "" || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("NO_COLOR") !== void 0 && (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("NO_COLOR") !== "" || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TERM") === "dumb") return COLORS_2;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TMUX")) return COLORS_16m;
    if ("TF_BUILD" in __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["env"] && "AGENT_NAME" in __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["env"]) return COLORS_16;
    if ("CI" in __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["env"]) {
        for (const { 0: envName, 1: colors } of CI_ENVS_MAP)if (envName in __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["env"]) return colors;
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("CI_NAME") === "codeship") return COLORS_256;
        return COLORS_2;
    }
    if ("TEAMCITY_VERSION" in __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["env"]) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.exec((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TEAMCITY_VERSION")) !== null ? COLORS_16 : COLORS_2;
    switch((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TERM_PROGRAM")){
        case "iTerm.app":
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TERM_PROGRAM_VERSION") || /^[0-2]\./.exec((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TERM_PROGRAM_VERSION")) !== null) return COLORS_256;
            return COLORS_16m;
        case "HyperTerm":
        case "MacTerm":
            return COLORS_16m;
        case "Apple_Terminal":
            return COLORS_256;
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("COLORTERM") === "truecolor" || (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("COLORTERM") === "24bit") return COLORS_16m;
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TERM")) {
        if (/truecolor/.exec((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TERM")) !== null) return COLORS_16m;
        if (/^xterm-256/.exec((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TERM")) !== null) return COLORS_256;
        const termEnv = (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("TERM").toLowerCase();
        if (TERM_ENVS[termEnv]) return TERM_ENVS[termEnv];
        if (TERM_ENVS_REG_EXP.some((term)=>term.exec(termEnv) !== null)) return COLORS_16;
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEnvVar"])("COLORTERM")) return COLORS_16;
    return COLORS_2;
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/logger.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TTY_COLORS",
    ()=>TTY_COLORS,
    "createLogger",
    ()=>createLogger,
    "levels",
    ()=>levels,
    "logger",
    ()=>logger,
    "shouldPublishLog",
    ()=>shouldPublishLog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$color$2d$depth$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/color-depth.mjs [app-client] (ecmascript)");
;
//#region src/env/logger.ts
const TTY_COLORS = {
    reset: "\x1B[0m",
    bright: "\x1B[1m",
    dim: "\x1B[2m",
    undim: "\x1B[22m",
    underscore: "\x1B[4m",
    blink: "\x1B[5m",
    reverse: "\x1B[7m",
    hidden: "\x1B[8m",
    fg: {
        black: "\x1B[30m",
        red: "\x1B[31m",
        green: "\x1B[32m",
        yellow: "\x1B[33m",
        blue: "\x1B[34m",
        magenta: "\x1B[35m",
        cyan: "\x1B[36m",
        white: "\x1B[37m"
    },
    bg: {
        black: "\x1B[40m",
        red: "\x1B[41m",
        green: "\x1B[42m",
        yellow: "\x1B[43m",
        blue: "\x1B[44m",
        magenta: "\x1B[45m",
        cyan: "\x1B[46m",
        white: "\x1B[47m"
    }
};
const levels = [
    "debug",
    "info",
    "success",
    "warn",
    "error"
];
function shouldPublishLog(currentLogLevel, logLevel) {
    return levels.indexOf(logLevel) >= levels.indexOf(currentLogLevel);
}
const levelColors = {
    info: TTY_COLORS.fg.blue,
    success: TTY_COLORS.fg.green,
    warn: TTY_COLORS.fg.yellow,
    error: TTY_COLORS.fg.red,
    debug: TTY_COLORS.fg.magenta
};
const formatMessage = (level, message, colorsEnabled)=>{
    const timestamp = /* @__PURE__ */ new Date().toISOString();
    if (colorsEnabled) return `${TTY_COLORS.dim}${timestamp}${TTY_COLORS.reset} ${levelColors[level]}${level.toUpperCase()}${TTY_COLORS.reset} ${TTY_COLORS.bright}[Better Auth]:${TTY_COLORS.reset} ${message}`;
    return `${timestamp} ${level.toUpperCase()} [Better Auth]: ${message}`;
};
const createLogger = (options)=>{
    const enabled = options?.disabled !== true;
    const logLevel = options?.level ?? "warn";
    const colorsEnabled = options?.disableColors !== void 0 ? !options.disableColors : (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$color$2d$depth$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getColorDepth"])() !== 1;
    const LogFunc = (level, message, args = [])=>{
        if (!enabled || !shouldPublishLog(logLevel, level)) return;
        const formattedMessage = formatMessage(level, message, colorsEnabled);
        if (!options || typeof options.log !== "function") {
            if (level === "error") console.error(formattedMessage, ...args);
            else if (level === "warn") console.warn(formattedMessage, ...args);
            else console.log(formattedMessage, ...args);
            return;
        }
        options.log(level === "success" ? "info" : level, message, ...args);
    };
    return {
        ...Object.fromEntries(levels.map((level)=>[
                level,
                (...[message, ...args])=>LogFunc(level, message, args)
            ])),
        get level () {
            return logLevel;
        }
    };
};
const logger = createLogger();
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/index.mjs [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$env$2d$impl$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/env-impl.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$color$2d$depth$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/color-depth.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f40$better$2d$auth$2f$core$2f$dist$2f$env$2f$logger$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/env/logger.mjs [app-client] (ecmascript)");
;
;
;
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-auth/core/dist/utils/string.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "capitalizeFirstLetter",
    ()=>capitalizeFirstLetter
]);
//#region src/utils/string.ts
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/better-call/dist/error.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "APIError",
    ()=>APIError,
    "BetterCallError",
    ()=>BetterCallError,
    "ValidationError",
    ()=>ValidationError,
    "hideInternalStackFrames",
    ()=>hideInternalStackFrames,
    "kAPIErrorHeaderSymbol",
    ()=>kAPIErrorHeaderSymbol,
    "makeErrorForHideStackFrame",
    ()=>makeErrorForHideStackFrame,
    "statusCodes",
    ()=>statusCodes
]);
//#region src/error.ts
function isErrorStackTraceLimitWritable() {
    const desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
    if (desc === void 0) return Object.isExtensible(Error);
    return Object.prototype.hasOwnProperty.call(desc, "writable") ? desc.writable : desc.set !== void 0;
}
/**
* Hide internal stack frames from the error stack trace.
*/ function hideInternalStackFrames(stack) {
    const lines = stack.split("\n    at ");
    if (lines.length <= 1) return stack;
    lines.splice(1, 1);
    return lines.join("\n    at ");
}
/**
* Creates a custom error class that hides stack frames.
*/ function makeErrorForHideStackFrame(Base, clazz) {
    class HideStackFramesError extends Base {
        #hiddenStack;
        constructor(...args){
            if (isErrorStackTraceLimitWritable()) {
                const limit = Error.stackTraceLimit;
                Error.stackTraceLimit = 0;
                super(...args);
                Error.stackTraceLimit = limit;
            } else super(...args);
            const stack = /* @__PURE__ */ new Error().stack;
            if (stack) this.#hiddenStack = hideInternalStackFrames(stack.replace(/^Error/, this.name));
        }
        get errorStack() {
            return this.#hiddenStack;
        }
    }
    Object.defineProperty(HideStackFramesError.prototype, "constructor", {
        get () {
            return clazz;
        },
        enumerable: false,
        configurable: true
    });
    return HideStackFramesError;
}
const statusCodes = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    MULTIPLE_CHOICES: 300,
    MOVED_PERMANENTLY: 301,
    FOUND: 302,
    SEE_OTHER: 303,
    NOT_MODIFIED: 304,
    TEMPORARY_REDIRECT: 307,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    NOT_ACCEPTABLE: 406,
    PROXY_AUTHENTICATION_REQUIRED: 407,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    LENGTH_REQUIRED: 411,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    URI_TOO_LONG: 414,
    UNSUPPORTED_MEDIA_TYPE: 415,
    RANGE_NOT_SATISFIABLE: 416,
    EXPECTATION_FAILED: 417,
    "I'M_A_TEAPOT": 418,
    MISDIRECTED_REQUEST: 421,
    UNPROCESSABLE_ENTITY: 422,
    LOCKED: 423,
    FAILED_DEPENDENCY: 424,
    TOO_EARLY: 425,
    UPGRADE_REQUIRED: 426,
    PRECONDITION_REQUIRED: 428,
    TOO_MANY_REQUESTS: 429,
    REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
    UNAVAILABLE_FOR_LEGAL_REASONS: 451,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
    HTTP_VERSION_NOT_SUPPORTED: 505,
    VARIANT_ALSO_NEGOTIATES: 506,
    INSUFFICIENT_STORAGE: 507,
    LOOP_DETECTED: 508,
    NOT_EXTENDED: 510,
    NETWORK_AUTHENTICATION_REQUIRED: 511
};
var InternalAPIError = class extends Error {
    constructor(status = "INTERNAL_SERVER_ERROR", body = void 0, headers = {}, statusCode = typeof status === "number" ? status : statusCodes[status]){
        super(body?.message, body?.cause ? {
            cause: body.cause
        } : void 0);
        this.status = status;
        this.body = body;
        this.headers = headers;
        this.statusCode = statusCode;
        this.name = "APIError";
        this.status = status;
        this.headers = headers;
        this.statusCode = statusCode;
        this.body = body;
    }
};
var ValidationError = class extends InternalAPIError {
    constructor(message, issues){
        super(400, {
            message,
            code: "VALIDATION_ERROR"
        });
        this.message = message;
        this.issues = issues;
        this.issues = issues;
    }
};
var BetterCallError = class extends Error {
    constructor(message){
        super(message);
        this.name = "BetterCallError";
    }
};
const kAPIErrorHeaderSymbol = Symbol.for("better-call:api-error-headers");
const APIError = makeErrorForHideStackFrame(InternalAPIError, Error);
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/nanostores/task/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "allTasks",
    ()=>allTasks,
    "cleanTasks",
    ()=>cleanTasks,
    "startTask",
    ()=>startTask,
    "task",
    ()=>task
]);
let tasks = 0;
let resolves = [];
function startTask() {
    tasks += 1;
    return ()=>{
        tasks -= 1;
        if (tasks === 0) {
            let prevResolves = resolves;
            resolves = [];
            for (let i of prevResolves)i();
        }
    };
}
function task(cb) {
    let endTask = startTask();
    let promise = cb().finally(endTask);
    promise.t = true;
    return promise;
}
function allTasks() {
    if (tasks === 0) {
        return Promise.resolve();
    } else {
        return new Promise((resolve)=>{
            resolves.push(resolve);
        });
    }
}
function cleanTasks() {
    tasks = 0;
}
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/nanostores/clean-stores/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "clean",
    ()=>clean,
    "cleanStores",
    ()=>cleanStores
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$nanostores$2f$task$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/nanostores/task/index.js [app-client] (ecmascript)");
;
let clean = Symbol('clean');
let cleanStores = (...stores)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$nanostores$2f$task$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cleanTasks"])();
    for (let $store of stores){
        if ($store) {
            if ($store.mocked) delete $store.mocked;
            if ($store[clean]) $store[clean]();
        }
    }
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/nanostores/atom/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "atom",
    ()=>atom,
    "epoch",
    ()=>epoch,
    "readonlyType",
    ()=>readonlyType
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$nanostores$2f$clean$2d$stores$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/nanostores/clean-stores/index.js [app-client] (ecmascript)");
;
let listenerQueue = [];
let lqIndex = 0;
const QUEUE_ITEMS_PER_LISTENER = 4;
let epoch = 0;
const atom = (initialValue)=>{
    let listeners = [];
    let $atom = {
        get () {
            if (!$atom.lc) {
                $atom.listen(()=>{})();
            }
            return $atom.value;
        },
        init: initialValue,
        lc: 0,
        listen (listener) {
            $atom.lc = listeners.push(listener);
            return ()=>{
                for(let i = lqIndex + QUEUE_ITEMS_PER_LISTENER; i < listenerQueue.length;){
                    if (listenerQueue[i] === listener) {
                        listenerQueue.splice(i, QUEUE_ITEMS_PER_LISTENER);
                    } else {
                        i += QUEUE_ITEMS_PER_LISTENER;
                    }
                }
                let index = listeners.indexOf(listener);
                if (~index) {
                    listeners.splice(index, 1);
                    if (!--$atom.lc) $atom.off();
                }
            };
        },
        notify (oldValue, changedKey) {
            epoch++;
            let runListenerQueue = !listenerQueue.length;
            for (let listener of listeners){
                listenerQueue.push(listener, $atom.value, oldValue, changedKey);
            }
            if (runListenerQueue) {
                for(lqIndex = 0; lqIndex < listenerQueue.length; lqIndex += QUEUE_ITEMS_PER_LISTENER){
                    listenerQueue[lqIndex](listenerQueue[lqIndex + 1], listenerQueue[lqIndex + 2], listenerQueue[lqIndex + 3]);
                }
                listenerQueue.length = 0;
            }
        },
        /* It will be called on last listener unsubscribing.
       We will redefine it in onMount and onStop. */ off () {},
        set (newValue) {
            let oldValue = $atom.value;
            if (oldValue !== newValue) {
                $atom.value = newValue;
                $atom.notify(oldValue);
            }
        },
        subscribe (listener) {
            let unbind = $atom.listen(listener);
            listener($atom.value);
            return unbind;
        },
        value: initialValue
    };
    if ("TURBOPACK compile-time truthy", 1) {
        $atom[__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$nanostores$2f$clean$2d$stores$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clean"]] = ()=>{
            listeners = [];
            $atom.lc = 0;
            $atom.off();
        };
    }
    return $atom;
};
const readonlyType = (store)=>store;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/nanostores/lifecycle/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "STORE_UNMOUNT_DELAY",
    ()=>STORE_UNMOUNT_DELAY,
    "on",
    ()=>on,
    "onMount",
    ()=>onMount,
    "onNotify",
    ()=>onNotify,
    "onSet",
    ()=>onSet,
    "onStart",
    ()=>onStart,
    "onStop",
    ()=>onStop
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$nanostores$2f$clean$2d$stores$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/nanostores/clean-stores/index.js [app-client] (ecmascript)");
;
const START = 0;
const STOP = 1;
const SET = 2;
const NOTIFY = 3;
const MOUNT = 5;
const UNMOUNT = 6;
const REVERT_MUTATION = 10;
let on = (object, listener, eventKey, mutateStore)=>{
    object.events = object.events || {};
    if (!object.events[eventKey + REVERT_MUTATION]) {
        object.events[eventKey + REVERT_MUTATION] = mutateStore((eventProps)=>{
            // eslint-disable-next-line no-sequences
            object.events[eventKey].reduceRight((event, l)=>(l(event), event), {
                shared: {},
                ...eventProps
            });
        });
    }
    object.events[eventKey] = object.events[eventKey] || [];
    object.events[eventKey].push(listener);
    return ()=>{
        let currentListeners = object.events[eventKey];
        let index = currentListeners.indexOf(listener);
        currentListeners.splice(index, 1);
        if (!currentListeners.length) {
            delete object.events[eventKey];
            object.events[eventKey + REVERT_MUTATION]();
            delete object.events[eventKey + REVERT_MUTATION];
        }
    };
};
let onStart = ($store, listener)=>on($store, listener, START, (runListeners)=>{
        let originListen = $store.listen;
        $store.listen = (arg)=>{
            if (!$store.lc && !$store.starting) {
                $store.starting = true;
                runListeners();
                delete $store.starting;
            }
            return originListen(arg);
        };
        return ()=>{
            $store.listen = originListen;
        };
    });
let onStop = ($store, listener)=>on($store, listener, STOP, (runListeners)=>{
        let originOff = $store.off;
        $store.off = ()=>{
            runListeners();
            originOff();
        };
        return ()=>{
            $store.off = originOff;
        };
    });
let onSet = ($store, listener)=>on($store, listener, SET, (runListeners)=>{
        let originSet = $store.set;
        let originSetKey = $store.setKey;
        if ($store.setKey) {
            $store.setKey = (changed, changedValue)=>{
                let isAborted;
                let abort = ()=>{
                    isAborted = true;
                };
                runListeners({
                    abort,
                    changed,
                    newValue: {
                        ...$store.value,
                        [changed]: changedValue
                    }
                });
                if (!isAborted) return originSetKey(changed, changedValue);
            };
        }
        $store.set = (newValue)=>{
            let isAborted;
            let abort = ()=>{
                isAborted = true;
            };
            runListeners({
                abort,
                newValue
            });
            if (!isAborted) return originSet(newValue);
        };
        return ()=>{
            $store.set = originSet;
            $store.setKey = originSetKey;
        };
    });
let onNotify = ($store, listener)=>on($store, listener, NOTIFY, (runListeners)=>{
        let originNotify = $store.notify;
        $store.notify = (oldValue, changed)=>{
            let isAborted;
            let abort = ()=>{
                isAborted = true;
            };
            runListeners({
                abort,
                changed,
                oldValue
            });
            if (!isAborted) return originNotify(oldValue, changed);
        };
        return ()=>{
            $store.notify = originNotify;
        };
    });
let STORE_UNMOUNT_DELAY = 1000;
let onMount = ($store, initialize)=>{
    let listener = (payload)=>{
        let destroy = initialize(payload);
        if (destroy) $store.events[UNMOUNT].push(destroy);
    };
    return on($store, listener, MOUNT, (runListeners)=>{
        let originListen = $store.listen;
        $store.listen = (...args)=>{
            if (!$store.lc && !$store.active) {
                $store.active = true;
                runListeners();
            }
            return originListen(...args);
        };
        let originOff = $store.off;
        $store.events[UNMOUNT] = [];
        $store.off = ()=>{
            originOff();
            setTimeout(()=>{
                if ($store.active && !$store.lc) {
                    $store.active = false;
                    for (let destroy of $store.events[UNMOUNT])destroy();
                    $store.events[UNMOUNT] = [];
                }
            }, STORE_UNMOUNT_DELAY);
        };
        if ("TURBOPACK compile-time truthy", 1) {
            let originClean = $store[__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$nanostores$2f$clean$2d$stores$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clean"]];
            $store[__TURBOPACK__imported__module__$5b$project$5d2f2e$claude$2f$worktrees$2f$migrate$2d$users$2d$web$2d$nextjs$2f$node_modules$2f$nanostores$2f$clean$2d$stores$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clean"]] = ()=>{
                for (let destroy of $store.events[UNMOUNT])destroy();
                $store.events[UNMOUNT] = [];
                $store.active = false;
                originClean();
            };
        }
        return ()=>{
            $store.listen = originListen;
            $store.off = originOff;
        };
    });
};
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/nanostores/listen-keys/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "listenKeys",
    ()=>listenKeys,
    "subscribeKeys",
    ()=>subscribeKeys
]);
function listenKeys($store, keys, listener) {
    let keysSet = new Set(keys).add(undefined);
    return $store.listen((value, oldValue, changed)=>{
        if (keysSet.has(changed)) {
            listener(value, oldValue, changed);
        }
    });
}
function subscribeKeys($store, keys, listener) {
    let unbind = listenKeys($store, keys, listener);
    listener($store.value);
    return unbind;
}
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/defu/dist/defu.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createDefu",
    ()=>createDefu,
    "default",
    ()=>defu,
    "defu",
    ()=>defu,
    "defuArrayFn",
    ()=>defuArrayFn,
    "defuFn",
    ()=>defuFn
]);
function isPlainObject(value) {
    if (value === null || typeof value !== "object") {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
        return false;
    }
    if (Symbol.iterator in value) {
        return false;
    }
    if (Symbol.toStringTag in value) {
        return Object.prototype.toString.call(value) === "[object Module]";
    }
    return true;
}
function _defu(baseObject, defaults, namespace = ".", merger) {
    if (!isPlainObject(defaults)) {
        return _defu(baseObject, {}, namespace, merger);
    }
    const object = Object.assign({}, defaults);
    for(const key in baseObject){
        if (key === "__proto__" || key === "constructor") {
            continue;
        }
        const value = baseObject[key];
        if (value === null || value === void 0) {
            continue;
        }
        if (merger && merger(object, key, value, namespace)) {
            continue;
        }
        if (Array.isArray(value) && Array.isArray(object[key])) {
            object[key] = [
                ...value,
                ...object[key]
            ];
        } else if (isPlainObject(value) && isPlainObject(object[key])) {
            object[key] = _defu(value, object[key], (namespace ? `${namespace}.` : "") + key.toString(), merger);
        } else {
            object[key] = value;
        }
    }
    return object;
}
function createDefu(merger) {
    return (...arguments_)=>// eslint-disable-next-line unicorn/no-array-reduce
        arguments_.reduce((p, c)=>_defu(p, c, "", merger), {});
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue)=>{
    if (object[key] !== void 0 && typeof currentValue === "function") {
        object[key] = currentValue(object[key]);
        return true;
    }
});
const defuArrayFn = createDefu((object, key, currentValue)=>{
    if (Array.isArray(object[key]) && typeof currentValue === "function") {
        object[key] = currentValue(object[key]);
        return true;
    }
});
;
}),
"[project]/.claude/worktrees/migrate-users-web-nextjs/node_modules/@better-fetch/fetch/dist/index.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BetterFetchError",
    ()=>BetterFetchError,
    "ValidationError",
    ()=>ValidationError,
    "applySchemaPlugin",
    ()=>applySchemaPlugin,
    "betterFetch",
    ()=>betterFetch,
    "bodyParser",
    ()=>bodyParser,
    "createFetch",
    ()=>createFetch,
    "createRetryStrategy",
    ()=>createRetryStrategy,
    "createSchema",
    ()=>createSchema,
    "detectContentType",
    ()=>detectContentType,
    "detectResponseType",
    ()=>detectResponseType,
    "getBody",
    ()=>getBody,
    "getFetch",
    ()=>getFetch,
    "getHeaders",
    ()=>getHeaders,
    "getMethod",
    ()=>getMethod,
    "getTimeout",
    ()=>getTimeout,
    "getURL",
    ()=>getURL,
    "initializePlugins",
    ()=>initializePlugins,
    "isFunction",
    ()=>isFunction,
    "isJSONParsable",
    ()=>isJSONParsable,
    "isJSONSerializable",
    ()=>isJSONSerializable,
    "isPayloadMethod",
    ()=>isPayloadMethod,
    "isRouteMethod",
    ()=>isRouteMethod,
    "jsonParse",
    ()=>jsonParse,
    "methods",
    ()=>methods,
    "parseStandardSchema",
    ()=>parseStandardSchema
]);
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value)=>key in obj ? __defProp(obj, key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value
    }) : obj[key] = value;
var __spreadValues = (a, b)=>{
    for(var prop in b || (b = {}))if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols) for (var prop of __getOwnPropSymbols(b)){
        if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
    return a;
};
var __spreadProps = (a, b)=>__defProps(a, __getOwnPropDescs(b));
// src/error.ts
var BetterFetchError = class extends Error {
    constructor(status, statusText, error){
        super(statusText || status.toString(), {
            cause: error
        });
        this.status = status;
        this.statusText = statusText;
        this.error = error;
        Error.captureStackTrace(this, this.constructor);
    }
};
// src/plugins.ts
var initializePlugins = async (url, options)=>{
    var _a, _b, _c, _d, _e, _f;
    let opts = options || {};
    const hooks = {
        onRequest: [
            options == null ? void 0 : options.onRequest
        ],
        onResponse: [
            options == null ? void 0 : options.onResponse
        ],
        onSuccess: [
            options == null ? void 0 : options.onSuccess
        ],
        onError: [
            options == null ? void 0 : options.onError
        ],
        onRetry: [
            options == null ? void 0 : options.onRetry
        ]
    };
    if (!options || !(options == null ? void 0 : options.plugins)) {
        return {
            url,
            options: opts,
            hooks
        };
    }
    for (const plugin of (options == null ? void 0 : options.plugins) || []){
        if (plugin.init) {
            const pluginRes = await ((_a = plugin.init) == null ? void 0 : _a.call(plugin, url.toString(), options));
            opts = pluginRes.options || opts;
            url = pluginRes.url;
        }
        hooks.onRequest.push((_b = plugin.hooks) == null ? void 0 : _b.onRequest);
        hooks.onResponse.push((_c = plugin.hooks) == null ? void 0 : _c.onResponse);
        hooks.onSuccess.push((_d = plugin.hooks) == null ? void 0 : _d.onSuccess);
        hooks.onError.push((_e = plugin.hooks) == null ? void 0 : _e.onError);
        hooks.onRetry.push((_f = plugin.hooks) == null ? void 0 : _f.onRetry);
    }
    return {
        url,
        options: opts,
        hooks
    };
};
// src/retry.ts
var LinearRetryStrategy = class {
    constructor(options){
        this.options = options;
    }
    shouldAttemptRetry(attempt, response) {
        if (this.options.shouldRetry) {
            return Promise.resolve(attempt < this.options.attempts && this.options.shouldRetry(response));
        }
        return Promise.resolve(attempt < this.options.attempts);
    }
    getDelay() {
        return this.options.delay;
    }
};
var ExponentialRetryStrategy = class {
    constructor(options){
        this.options = options;
    }
    shouldAttemptRetry(attempt, response) {
        if (this.options.shouldRetry) {
            return Promise.resolve(attempt < this.options.attempts && this.options.shouldRetry(response));
        }
        return Promise.resolve(attempt < this.options.attempts);
    }
    getDelay(attempt) {
        const delay = Math.min(this.options.maxDelay, this.options.baseDelay * 2 ** attempt);
        return delay;
    }
};
function createRetryStrategy(options) {
    if (typeof options === "number") {
        return new LinearRetryStrategy({
            type: "linear",
            attempts: options,
            delay: 1e3
        });
    }
    switch(options.type){
        case "linear":
            return new LinearRetryStrategy(options);
        case "exponential":
            return new ExponentialRetryStrategy(options);
        default:
            throw new Error("Invalid retry strategy");
    }
}
// src/auth.ts
var getAuthHeader = async (options)=>{
    const headers = {};
    const getValue = async (value)=>typeof value === "function" ? await value() : value;
    if (options == null ? void 0 : options.auth) {
        if (options.auth.type === "Bearer") {
            const token = await getValue(options.auth.token);
            if (!token) {
                return headers;
            }
            headers["authorization"] = `Bearer ${token}`;
        } else if (options.auth.type === "Basic") {
            const [username, password] = await Promise.all([
                getValue(options.auth.username),
                getValue(options.auth.password)
            ]);
            if (!username || !password) {
                return headers;
            }
            headers["authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
        } else if (options.auth.type === "Custom") {
            const [prefix, value] = await Promise.all([
                getValue(options.auth.prefix),
                getValue(options.auth.value)
            ]);
            if (!value) {
                return headers;
            }
            headers["authorization"] = `${prefix != null ? prefix : ""} ${value}`;
        }
    }
    return headers;
};
// src/utils.ts
var JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(request) {
    const _contentType = request.headers.get("content-type");
    const textTypes = /* @__PURE__ */ new Set([
        "image/svg",
        "application/xml",
        "application/xhtml",
        "application/html"
    ]);
    if (!_contentType) {
        return "json";
    }
    const contentType = _contentType.split(";").shift() || "";
    if (JSON_RE.test(contentType)) {
        return "json";
    }
    if (textTypes.has(contentType) || contentType.startsWith("text/")) {
        return "text";
    }
    return "blob";
}
function isJSONParsable(value) {
    try {
        JSON.parse(value);
        return true;
    } catch (error) {
        return false;
    }
}
function isJSONSerializable(value) {
    if (value === void 0) {
        return false;
    }
    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean" || t === null) {
        return true;
    }
    if (t !== "object") {
        return false;
    }
    if (Array.isArray(value)) {
        return true;
    }
    if (value.buffer) {
        return false;
    }
    return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
function jsonParse(text) {
    try {
        return JSON.parse(text);
    } catch (error) {
        return text;
    }
}
function isFunction(value) {
    return typeof value === "function";
}
function getFetch(options) {
    if (options == null ? void 0 : options.customFetchImpl) {
        return options.customFetchImpl;
    }
    if (typeof globalThis !== "undefined" && isFunction(globalThis.fetch)) {
        return globalThis.fetch;
    }
    if (typeof window !== "undefined" && isFunction(window.fetch)) {
        return window.fetch;
    }
    throw new Error("No fetch implementation found");
}
function isPayloadMethod(method) {
    if (!method) {
        return false;
    }
    const payloadMethod = [
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ];
    return payloadMethod.includes(method.toUpperCase());
}
function isRouteMethod(method) {
    const routeMethod = [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ];
    if (!method) {
        return false;
    }
    return routeMethod.includes(method.toUpperCase());
}
async function getHeaders(opts) {
    const headers = new Headers(opts == null ? void 0 : opts.headers);
    const authHeader = await getAuthHeader(opts);
    for (const [key, value] of Object.entries(authHeader || {})){
        headers.set(key, value);
    }
    if (!headers.has("content-type")) {
        const t = detectContentType(opts == null ? void 0 : opts.body);
        if (t) {
            headers.set("content-type", t);
        }
    }
    return headers;
}
function getURL(url, options) {
    if (url.startsWith("@")) {
        const m = url.toString().split("@")[1].split("/")[0];
        if (methods.includes(m)) {
            url = url.replace(`@${m}/`, "/");
        }
    }
    let _url;
    try {
        if (url.startsWith("http")) {
            _url = url;
        } else {
            let baseURL = options == null ? void 0 : options.baseURL;
            if (baseURL && !(baseURL == null ? void 0 : baseURL.endsWith("/"))) {
                baseURL = baseURL + "/";
            }
            if (url.startsWith("/")) {
                _url = new URL(url.substring(1), baseURL);
            } else {
                _url = new URL(url, options == null ? void 0 : options.baseURL);
            }
        }
    } catch (e) {
        if (e instanceof TypeError) {
            if (!(options == null ? void 0 : options.baseURL)) {
                throw TypeError(`Invalid URL ${url}. Are you passing in a relative url but not setting the baseURL?`);
            }
            throw TypeError(`Invalid URL ${url}. Please validate that you are passing the correct input.`);
        }
        throw e;
    }
    if (options == null ? void 0 : options.params) {
        if (Array.isArray(options == null ? void 0 : options.params)) {
            const params = (options == null ? void 0 : options.params) ? Array.isArray(options.params) ? `/${options.params.join("/")}` : `/${Object.values(options.params).join("/")}` : "";
            _url = _url.toString().split("/:")[0];
            _url = `${_url.toString()}${params}`;
        } else {
            for (const [key, value] of Object.entries(options == null ? void 0 : options.params)){
                _url = _url.toString().replace(`:${key}`, String(value));
            }
        }
    }
    const __url = new URL(_url);
    const queryParams = options == null ? void 0 : options.query;
    if (queryParams) {
        for (const [key, value] of Object.entries(queryParams)){
            __url.searchParams.append(key, String(value));
        }
    }
    return __url;
}
function detectContentType(body) {
    if (isJSONSerializable(body)) {
        return "application/json";
    }
    return null;
}
function getBody(options) {
    if (!(options == null ? void 0 : options.body)) {
        return null;
    }
    const headers = new Headers(options == null ? void 0 : options.headers);
    if (isJSONSerializable(options.body) && !headers.has("content-type")) {
        for (const [key, value] of Object.entries(options == null ? void 0 : options.body)){
            if (value instanceof Date) {
                options.body[key] = value.toISOString();
            }
        }
        return JSON.stringify(options.body);
    }
    if (headers.has("content-type") && headers.get("content-type") === "application/x-www-form-urlencoded") {
        if (isJSONSerializable(options.body)) {
            return new URLSearchParams(options.body).toString();
        }
        return options.body;
    }
    return options.body;
}
function getMethod(url, options) {
    var _a;
    if (options == null ? void 0 : options.method) {
        return options.method.toUpperCase();
    }
    if (url.startsWith("@")) {
        const pMethod = (_a = url.split("@")[1]) == null ? void 0 : _a.split("/")[0];
        if (!methods.includes(pMethod)) {
            return (options == null ? void 0 : options.body) ? "POST" : "GET";
        }
        return pMethod.toUpperCase();
    }
    return (options == null ? void 0 : options.body) ? "POST" : "GET";
}
function getTimeout(options, controller) {
    let abortTimeout;
    if (!(options == null ? void 0 : options.signal) && (options == null ? void 0 : options.timeout)) {
        abortTimeout = setTimeout(()=>controller == null ? void 0 : controller.abort(), options == null ? void 0 : options.timeout);
    }
    return {
        abortTimeout,
        clearTimeout: ()=>{
            if (abortTimeout) {
                clearTimeout(abortTimeout);
            }
        }
    };
}
function bodyParser(data, responseType) {
    if (responseType === "json") {
        return JSON.parse(data);
    }
    return data;
}
var ValidationError = class _ValidationError extends Error {
    constructor(issues, message){
        super(message || JSON.stringify(issues, null, 2));
        this.issues = issues;
        Object.setPrototypeOf(this, _ValidationError.prototype);
    }
};
async function parseStandardSchema(schema, input) {
    const result = await schema["~standard"].validate(input);
    if (result.issues) {
        throw new ValidationError(result.issues);
    }
    return result.value;
}
// src/create-fetch/schema.ts
var methods = [
    "get",
    "post",
    "put",
    "patch",
    "delete"
];
var createSchema = (schema, config)=>{
    return {
        schema,
        config
    };
};
// src/create-fetch/index.ts
var applySchemaPlugin = (config)=>({
        id: "apply-schema",
        name: "Apply Schema",
        version: "1.0.0",
        async init (url, options) {
            var _a, _b, _c, _d;
            const schema = ((_b = (_a = config.plugins) == null ? void 0 : _a.find((plugin)=>{
                var _a2;
                return ((_a2 = plugin.schema) == null ? void 0 : _a2.config) ? url.startsWith(plugin.schema.config.baseURL || "") || url.startsWith(plugin.schema.config.prefix || "") : false;
            })) == null ? void 0 : _b.schema) || config.schema;
            if (schema) {
                let urlKey = url;
                if ((_c = schema.config) == null ? void 0 : _c.prefix) {
                    if (urlKey.startsWith(schema.config.prefix)) {
                        urlKey = urlKey.replace(schema.config.prefix, "");
                        if (schema.config.baseURL) {
                            url = url.replace(schema.config.prefix, schema.config.baseURL);
                        }
                    }
                }
                if ((_d = schema.config) == null ? void 0 : _d.baseURL) {
                    if (urlKey.startsWith(schema.config.baseURL)) {
                        urlKey = urlKey.replace(schema.config.baseURL, "");
                    }
                }
                const keySchema = schema.schema[urlKey];
                if (keySchema) {
                    let opts = __spreadProps(__spreadValues({}, options), {
                        method: keySchema.method,
                        output: keySchema.output
                    });
                    if (!(options == null ? void 0 : options.disableValidation)) {
                        opts = __spreadProps(__spreadValues({}, opts), {
                            body: keySchema.input ? await parseStandardSchema(keySchema.input, options == null ? void 0 : options.body) : options == null ? void 0 : options.body,
                            params: keySchema.params ? await parseStandardSchema(keySchema.params, options == null ? void 0 : options.params) : options == null ? void 0 : options.params,
                            query: keySchema.query ? await parseStandardSchema(keySchema.query, options == null ? void 0 : options.query) : options == null ? void 0 : options.query
                        });
                    }
                    return {
                        url,
                        options: opts
                    };
                }
            }
            return {
                url,
                options
            };
        }
    });
var createFetch = (config)=>{
    async function $fetch(url, options) {
        const opts = __spreadProps(__spreadValues(__spreadValues({}, config), options), {
            plugins: [
                ...(config == null ? void 0 : config.plugins) || [],
                applySchemaPlugin(config || {}),
                ...(options == null ? void 0 : options.plugins) || []
            ]
        });
        if (config == null ? void 0 : config.catchAllError) {
            try {
                return await betterFetch(url, opts);
            } catch (error) {
                return {
                    data: null,
                    error: {
                        status: 500,
                        statusText: "Fetch Error",
                        message: "Fetch related error. Captured by catchAllError option. See error property for more details.",
                        error
                    }
                };
            }
        }
        return await betterFetch(url, opts);
    }
    return $fetch;
};
// src/url.ts
function getURL2(url, option) {
    const { baseURL, params, query } = option || {
        query: {},
        params: {},
        baseURL: ""
    };
    let basePath = url.startsWith("http") ? url.split("/").slice(0, 3).join("/") : baseURL || "";
    if (url.startsWith("@")) {
        const m = url.toString().split("@")[1].split("/")[0];
        if (methods.includes(m)) {
            url = url.replace(`@${m}/`, "/");
        }
    }
    if (!basePath.endsWith("/")) basePath += "/";
    let [path, urlQuery] = url.replace(basePath, "").split("?");
    const queryParams = new URLSearchParams(urlQuery);
    for (const [key, value] of Object.entries(query || {})){
        if (value == null) continue;
        let serializedValue;
        if (typeof value === "string") {
            serializedValue = value;
        } else if (Array.isArray(value)) {
            for (const val of value){
                queryParams.append(key, val);
            }
            continue;
        } else {
            serializedValue = JSON.stringify(value);
        }
        queryParams.set(key, serializedValue);
    }
    if (params) {
        if (Array.isArray(params)) {
            const paramPaths = path.split("/").filter((p)=>p.startsWith(":"));
            for (const [index, key] of paramPaths.entries()){
                const value = params[index];
                path = path.replace(key, value);
            }
        } else {
            for (const [key, value] of Object.entries(params)){
                path = path.replace(`:${key}`, String(value));
            }
        }
    }
    path = path.split("/").map(encodeURIComponent).join("/");
    if (path.startsWith("/")) path = path.slice(1);
    let queryParamString = queryParams.toString();
    queryParamString = queryParamString.length > 0 ? `?${queryParamString}`.replace(/\+/g, "%20") : "";
    if (!basePath.startsWith("http")) {
        return `${basePath}${path}${queryParamString}`;
    }
    const _url = new URL(`${path}${queryParamString}`, basePath);
    return _url;
}
// src/fetch.ts
var betterFetch = async (url, options)=>{
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { hooks, url: __url, options: opts } = await initializePlugins(url, options);
    const fetch = getFetch(opts);
    const controller = new AbortController();
    const signal = (_a = opts.signal) != null ? _a : controller.signal;
    const _url = getURL2(__url, opts);
    const body = getBody(opts);
    const headers = await getHeaders(opts);
    const method = getMethod(__url, opts);
    let context = __spreadProps(__spreadValues({}, opts), {
        url: _url,
        headers,
        body,
        method,
        signal
    });
    for (const onRequest of hooks.onRequest){
        if (onRequest) {
            const res = await onRequest(context);
            if (typeof res === "object" && res !== null) {
                context = res;
            }
        }
    }
    if ("pipeTo" in context && typeof context.pipeTo === "function" || typeof ((_b = options == null ? void 0 : options.body) == null ? void 0 : _b.pipe) === "function") {
        if (!("duplex" in context)) {
            context.duplex = "half";
        }
    }
    const { clearTimeout: clearTimeout2 } = getTimeout(opts, controller);
    let response = await fetch(context.url, context);
    clearTimeout2();
    const responseContext = {
        response,
        request: context
    };
    for (const onResponse of hooks.onResponse){
        if (onResponse) {
            const r = await onResponse(__spreadProps(__spreadValues({}, responseContext), {
                response: ((_c = options == null ? void 0 : options.hookOptions) == null ? void 0 : _c.cloneResponse) ? response.clone() : response
            }));
            if (r instanceof Response) {
                response = r;
            } else if (typeof r === "object" && r !== null) {
                response = r.response;
            }
        }
    }
    if (response.ok) {
        const hasBody = context.method !== "HEAD";
        if (!hasBody) {
            return {
                data: "",
                error: null
            };
        }
        const responseType = detectResponseType(response);
        const successContext = {
            data: null,
            response,
            request: context
        };
        if (responseType === "json" || responseType === "text") {
            const text = await response.text();
            const parser2 = (_d = context.jsonParser) != null ? _d : jsonParse;
            successContext.data = await parser2(text);
        } else {
            successContext.data = await response[responseType]();
        }
        if (context == null ? void 0 : context.output) {
            if (context.output && !context.disableValidation) {
                successContext.data = await parseStandardSchema(context.output, successContext.data);
            }
        }
        for (const onSuccess of hooks.onSuccess){
            if (onSuccess) {
                await onSuccess(__spreadProps(__spreadValues({}, successContext), {
                    response: ((_e = options == null ? void 0 : options.hookOptions) == null ? void 0 : _e.cloneResponse) ? response.clone() : response
                }));
            }
        }
        if (options == null ? void 0 : options.throw) {
            return successContext.data;
        }
        return {
            data: successContext.data,
            error: null
        };
    }
    const parser = (_f = options == null ? void 0 : options.jsonParser) != null ? _f : jsonParse;
    const responseText = await response.text();
    const isJSONResponse = isJSONParsable(responseText);
    const errorObject = isJSONResponse ? await parser(responseText) : null;
    const errorContext = {
        response,
        responseText,
        request: context,
        error: __spreadProps(__spreadValues({}, errorObject), {
            status: response.status,
            statusText: response.statusText
        })
    };
    for (const onError of hooks.onError){
        if (onError) {
            await onError(__spreadProps(__spreadValues({}, errorContext), {
                response: ((_g = options == null ? void 0 : options.hookOptions) == null ? void 0 : _g.cloneResponse) ? response.clone() : response
            }));
        }
    }
    if (options == null ? void 0 : options.retry) {
        const retryStrategy = createRetryStrategy(options.retry);
        const _retryAttempt = (_h = options.retryAttempt) != null ? _h : 0;
        if (await retryStrategy.shouldAttemptRetry(_retryAttempt, response)) {
            for (const onRetry of hooks.onRetry){
                if (onRetry) {
                    await onRetry(responseContext);
                }
            }
            const delay = retryStrategy.getDelay(_retryAttempt);
            await new Promise((resolve)=>setTimeout(resolve, delay));
            return await betterFetch(url, __spreadProps(__spreadValues({}, options), {
                retryAttempt: _retryAttempt + 1
            }));
        }
    }
    if (options == null ? void 0 : options.throw) {
        throw new BetterFetchError(response.status, response.statusText, isJSONResponse ? errorObject : responseText);
    }
    return {
        data: null,
        error: __spreadProps(__spreadValues({}, errorObject), {
            status: response.status,
            statusText: response.statusText
        })
    };
};
;
}),
]);

//# sourceMappingURL=03g6_0zvg0y0._.js.map