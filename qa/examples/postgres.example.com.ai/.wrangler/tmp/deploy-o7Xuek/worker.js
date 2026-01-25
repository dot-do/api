var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name2) {
  return new Error(`[unenv] ${name2} is not implemented yet!`);
}
function notImplemented(name2) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name2);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
function notImplementedClass(name2) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name2} is not implemented yet!`);
    }
  };
}
var init_utils = __esm({
  "node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(createNotImplementedError, "createNotImplementedError");
    __name(notImplemented, "notImplemented");
    __name(notImplementedClass, "notImplementedClass");
  }
});

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin, _performanceNow, nodeTiming, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceResourceTiming, PerformanceObserverEntryList, Performance, PerformanceObserver, performance2;
var init_performance = __esm({
  "node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
    nodeTiming = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry = class {
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name2, options) {
        this.name = name2;
        this.startTime = options?.startTime || _performanceNow();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    __name(PerformanceEntry, "PerformanceEntry");
    PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    }, "PerformanceMark");
    PerformanceMeasure = class extends PerformanceEntry {
      entryType = "measure";
    };
    __name(PerformanceMeasure, "PerformanceMeasure");
    PerformanceResourceTiming = class extends PerformanceEntry {
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    __name(PerformanceResourceTiming, "PerformanceResourceTiming");
    PerformanceObserverEntryList = class {
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    __name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
    Performance = class {
      __unenv__ = true;
      timeOrigin = _timeOrigin;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw createNotImplementedError("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin) {
          return _performanceNow();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name2, type) {
        return this._entries.filter((e) => e.name === name2 && (!type || e.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
      }
      mark(name2, options) {
        const entry = new PerformanceMark(name2, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start2;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start2 = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start2 = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure(measureName, {
          startTime: start2,
          detail: {
            start: start2,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw createNotImplementedError("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    __name(Performance, "Performance");
    PerformanceObserver = class {
      __unenv__ = true;
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw createNotImplementedError("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw createNotImplementedError("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args2) {
        return fn.call(thisArg, ...args2);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    __name(PerformanceObserver, "PerformanceObserver");
    __publicField(PerformanceObserver, "supportedEntryTypes", []);
    performance2 = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();
  }
});

// node_modules/unenv/dist/runtime/node/perf_hooks.mjs
var init_perf_hooks = __esm({
  "node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
var init_performance2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    globalThis.performance = performance2;
    globalThis.Performance = Performance;
    globalThis.PerformanceEntry = PerformanceEntry;
    globalThis.PerformanceMark = PerformanceMark;
    globalThis.PerformanceMeasure = PerformanceMeasure;
    globalThis.PerformanceObserver = PerformanceObserver;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming;
  }
});

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default;
var init_noop = __esm({
  "node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default = Object.assign(() => {
    }, { __unenv__: true });
  }
});

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";
var _console, _ignoreErrors, _stderr2, _stdout2, log, info2, trace, debug, table, error, warn, createTask, clear, count, countReset, dir, dirxml, group, groupEnd, groupCollapsed, profile, profileEnd, time, timeEnd, timeLog, timeStamp, Console, _times, _stdoutErrorHandler, _stderrErrorHandler;
var init_console = __esm({
  "node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console = globalThis.console;
    _ignoreErrors = true;
    _stderr2 = new Writable();
    _stdout2 = new Writable();
    log = _console?.log ?? noop_default;
    info2 = _console?.info ?? log;
    trace = _console?.trace ?? info2;
    debug = _console?.debug ?? log;
    table = _console?.table ?? log;
    error = _console?.error ?? log;
    warn = _console?.warn ?? error;
    createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
    clear = _console?.clear ?? noop_default;
    count = _console?.count ?? noop_default;
    countReset = _console?.countReset ?? noop_default;
    dir = _console?.dir ?? noop_default;
    dirxml = _console?.dirxml ?? noop_default;
    group = _console?.group ?? noop_default;
    groupEnd = _console?.groupEnd ?? noop_default;
    groupCollapsed = _console?.groupCollapsed ?? noop_default;
    profile = _console?.profile ?? noop_default;
    profileEnd = _console?.profileEnd ?? noop_default;
    time = _console?.time ?? noop_default;
    timeEnd = _console?.timeEnd ?? noop_default;
    timeLog = _console?.timeLog ?? noop_default;
    timeStamp = _console?.timeStamp ?? noop_default;
    Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
    _times = /* @__PURE__ */ new Map();
    _stdoutErrorHandler = noop_default;
    _stderrErrorHandler = noop_default;
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole, assert2, clear2, context, count2, countReset2, createTask2, debug2, dir2, dirxml2, error2, group2, groupCollapsed2, groupEnd2, info3, log2, profile2, profileEnd2, table2, time2, timeEnd2, timeLog2, timeStamp2, trace2, warn2, console_default;
var init_console2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole = globalThis["console"];
    ({
      assert: assert2,
      clear: clear2,
      context: (
        // @ts-expect-error undocumented public API
        context
      ),
      count: count2,
      countReset: countReset2,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask2
      ),
      debug: debug2,
      dir: dir2,
      dirxml: dirxml2,
      error: error2,
      group: group2,
      groupCollapsed: groupCollapsed2,
      groupEnd: groupEnd2,
      info: info3,
      log: log2,
      profile: profile2,
      profileEnd: profileEnd2,
      table: table2,
      time: time2,
      timeEnd: timeEnd2,
      timeLog: timeLog2,
      timeStamp: timeStamp2,
      trace: trace2,
      warn: warn2
    } = workerdConsole);
    Object.assign(workerdConsole, {
      Console,
      _ignoreErrors,
      _stderr: _stderr2,
      _stderrErrorHandler,
      _stdout: _stdout2,
      _stdoutErrorHandler,
      _times
    });
    console_default = workerdConsole;
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default;
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime;
var init_hrtime = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
      return BigInt(Date.now() * 1e6);
    }, "bigint") });
  }
});

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream;
var init_read_stream = __esm({
  "node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream = class extends Socket {
      fd;
      constructor(fd) {
        super();
        this.fd = fd;
      }
      isRaw = false;
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
      isTTY = false;
    };
    __name(ReadStream, "ReadStream");
  }
});

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream;
var init_write_stream = __esm({
  "node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream = class extends Socket2 {
      fd;
      constructor(fd) {
        super();
        this.fd = fd;
      }
      clearLine(dir3, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x3, y2, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env2) {
        return 1;
      }
      hasColors(count3, env2) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      columns = 80;
      rows = 24;
      isTTY = false;
    };
    __name(WriteStream, "WriteStream");
  }
});

// node_modules/unenv/dist/runtime/node/tty.mjs
var init_tty = __esm({
  "node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";
var Process;
var init_process = __esm({
  "node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    Process = class extends EventEmitter {
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args2) {
        return super.emit(...args2);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream(2);
      }
      #cwd = "/";
      chdir(cwd2) {
        this.#cwd = cwd2;
      }
      cwd() {
        return this.#cwd;
      }
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return "";
      }
      get versions() {
        return {};
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      ref() {
      }
      unref() {
      }
      umask() {
        throw createNotImplementedError("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw createNotImplementedError("process.getActiveResourcesInfo");
      }
      exit() {
        throw createNotImplementedError("process.exit");
      }
      reallyExit() {
        throw createNotImplementedError("process.reallyExit");
      }
      kill() {
        throw createNotImplementedError("process.kill");
      }
      abort() {
        throw createNotImplementedError("process.abort");
      }
      dlopen() {
        throw createNotImplementedError("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw createNotImplementedError("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw createNotImplementedError("process.loadEnvFile");
      }
      disconnect() {
        throw createNotImplementedError("process.disconnect");
      }
      cpuUsage() {
        throw createNotImplementedError("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw createNotImplementedError("process.initgroups");
      }
      openStdin() {
        throw createNotImplementedError("process.openStdin");
      }
      assert() {
        throw createNotImplementedError("process.assert");
      }
      binding() {
        throw createNotImplementedError("process.binding");
      }
      permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: () => 0 });
      mainModule = void 0;
      domain = void 0;
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
    __name(Process, "Process");
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess, getBuiltinModule, exit, platform, nextTick, unenvProcess, abort2, addListener, allowedNodeEnvironmentFlags, hasUncaughtExceptionCaptureCallback, setUncaughtExceptionCaptureCallback, loadEnvFile, sourceMapsEnabled, arch, argv, argv0, chdir, config, connected, constrainedMemory, availableMemory, cpuUsage, cwd, debugPort, dlopen, disconnect, emit, emitWarning, env, eventNames, execArgv, execPath, finalization, features, getActiveResourcesInfo, getMaxListeners, hrtime3, kill, listeners, listenerCount, memoryUsage, on, off, once, pid, ppid, prependListener, prependOnceListener, rawListeners, release, removeAllListeners, removeListener, report, resourceUsage, setMaxListeners, setSourceMapsEnabled, stderr, stdin, stdout, title, throwDeprecation, traceDeprecation, umask, uptime, version, versions, domain, initgroups, moduleLoadList, reallyExit, openStdin, assert3, binding, send, exitCode, channel, getegid, geteuid, getgid, getgroups, getuid, setegid, seteuid, setgid, setgroups, setuid, permission, mainModule, _events, _eventsCount, _exiting, _maxListeners, _debugEnd, _debugProcess, _fatalException, _getActiveHandles, _getActiveRequests, _kill, _preload_modules, _rawDebug, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, _disconnect, _handleQueue, _pendingMessage, _channel, _send2, _linkedBinding, _process, process_default;
var init_process2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess = globalThis["process"];
    getBuiltinModule = globalProcess.getBuiltinModule;
    ({ exit, platform, nextTick } = getBuiltinModule(
      "node:process"
    ));
    unenvProcess = new Process({
      env: globalProcess.env,
      hrtime,
      nextTick
    });
    ({
      abort: abort2,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      finalization,
      features,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      on,
      off,
      once,
      pid,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert3,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send: _send2,
      _linkedBinding
    } = unenvProcess);
    _process = {
      abort: abort2,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exit,
      finalization,
      features,
      getBuiltinModule,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      nextTick,
      on,
      off,
      once,
      pid,
      platform,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      // @ts-expect-error old API
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert3,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send: _send2,
      _linkedBinding
    };
    process_default = _process;
  }
});

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default;
  }
});

// node_modules/unenv/dist/runtime/node/module.mjs
var _cache, _extensions, createRequire, getCompileCacheDir, enableCompileCache, constants, builtinModules, isBuiltin, runMain, register, syncBuiltinESMExports, findSourceMap, flushCompileCache, wrap, wrapper, stripTypeScriptTypes, SourceMap, _debug, _findPath, _initPaths, _load, _nodeModulePaths, _preloadModules, _resolveFilename, _resolveLookupPaths, _stat2, _readPackage, findPackageJSON, getSourceMapsSupport, setSourceMapsSupport, _pathCache, globalPaths, Module2;
var init_module = __esm({
  "node_modules/unenv/dist/runtime/node/module.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _cache = /* @__PURE__ */ Object.create(null);
    _extensions = {
      ".js": /* @__PURE__ */ notImplemented("module.require.extensions['.js']"),
      ".json": /* @__PURE__ */ notImplemented("module.require.extensions['.json']"),
      ".node": /* @__PURE__ */ notImplemented("module.require.extensions['.node']")
    };
    createRequire = /* @__PURE__ */ __name(function(_filename) {
      return Object.assign(
        /* @__PURE__ */ notImplemented("module.require"),
        {
          resolve: Object.assign(
            /* @__PURE__ */ notImplemented("module.require.resolve"),
            { paths: /* @__PURE__ */ notImplemented("module.require.resolve.paths") }
          ),
          cache: /* @__PURE__ */ Object.create(null),
          extensions: _extensions,
          main: void 0
        }
      );
    }, "createRequire");
    getCompileCacheDir = /* @__PURE__ */ __name(function() {
      return void 0;
    }, "getCompileCacheDir");
    enableCompileCache = /* @__PURE__ */ __name(function(_cacheDir) {
      return {
        status: 0,
        message: "not implemented"
      };
    }, "enableCompileCache");
    constants = Object.freeze({ compileCacheStatus: Object.freeze({
      FAILED: 0,
      ENABLED: 1,
      ALREADY_ENABLED: 2,
      DISABLED: 3
    }) });
    builtinModules = [
      "_http_agent",
      "_http_client",
      "_http_common",
      "_http_incoming",
      "_http_outgoing",
      "_http_server",
      "_stream_duplex",
      "_stream_passthrough",
      "_stream_readable",
      "_stream_transform",
      "_stream_wrap",
      "_stream_writable",
      "_tls_common",
      "_tls_wrap",
      "assert",
      "assert/strict",
      "async_hooks",
      "buffer",
      "child_process",
      "cluster",
      "console",
      "constants",
      "crypto",
      "dgram",
      "diagnostics_channel",
      "dns",
      "dns/promises",
      "domain",
      "events",
      "fs",
      "fs/promises",
      "http",
      "http2",
      "https",
      "inspector",
      "inspector/promises",
      "module",
      "net",
      "os",
      "path",
      "path/posix",
      "path/win32",
      "perf_hooks",
      "process",
      "punycode",
      "querystring",
      "readline",
      "readline/promises",
      "repl",
      "stream",
      "stream/consumers",
      "stream/promises",
      "stream/web",
      "string_decoder",
      "sys",
      "timers",
      "timers/promises",
      "tls",
      "trace_events",
      "tty",
      "url",
      "util",
      "util/types",
      "v8",
      "vm",
      "wasi",
      "worker_threads",
      "zlib"
    ];
    isBuiltin = /* @__PURE__ */ __name(function(id) {
      return id.startsWith("node:") || builtinModules.includes(id);
    }, "isBuiltin");
    runMain = /* @__PURE__ */ notImplemented("module.runMain");
    register = /* @__PURE__ */ notImplemented("module.register");
    syncBuiltinESMExports = /* @__PURE__ */ __name(function() {
      return [];
    }, "syncBuiltinESMExports");
    findSourceMap = /* @__PURE__ */ __name(function(path, error3) {
      return void 0;
    }, "findSourceMap");
    flushCompileCache = /* @__PURE__ */ __name(function flushCompileCache2() {
    }, "flushCompileCache");
    wrap = /* @__PURE__ */ __name(function(source) {
      return `(function (exports, require, module, __filename, __dirname) { ${source}
});`;
    }, "wrap");
    wrapper = ["(function (exports, require, module, __filename, __dirname) { ", "\n});"];
    stripTypeScriptTypes = /* @__PURE__ */ notImplemented("module.stripTypeScriptTypes");
    SourceMap = /* @__PURE__ */ notImplementedClass("module.SourceMap");
    _debug = console.debug;
    _findPath = /* @__PURE__ */ notImplemented("module._findPath");
    _initPaths = /* @__PURE__ */ notImplemented("module._initPaths");
    _load = /* @__PURE__ */ notImplemented("module._load");
    _nodeModulePaths = /* @__PURE__ */ notImplemented("module._nodeModulePaths");
    _preloadModules = /* @__PURE__ */ notImplemented("module._preloadModules");
    _resolveFilename = /* @__PURE__ */ notImplemented("module._resolveFilename");
    _resolveLookupPaths = /* @__PURE__ */ notImplemented("module._resolveLookupPaths");
    _stat2 = /* @__PURE__ */ notImplemented("module._stat");
    _readPackage = /* @__PURE__ */ notImplemented("module._readPackage");
    findPackageJSON = /* @__PURE__ */ notImplemented("module.findPackageJSON");
    getSourceMapsSupport = /* @__PURE__ */ notImplemented("module.getSourceMapsSupport");
    setSourceMapsSupport = /* @__PURE__ */ notImplemented("module.setSourceMapsSupport");
    _pathCache = /* @__PURE__ */ Object.create(null);
    globalPaths = ["node_modules"];
    Module2 = {
      get Module() {
        return Module2;
      },
      SourceMap,
      _cache,
      _extensions,
      _debug,
      _pathCache,
      _findPath,
      _initPaths,
      _load,
      _nodeModulePaths,
      _preloadModules,
      _resolveFilename,
      _resolveLookupPaths,
      _stat: _stat2,
      _readPackage,
      builtinModules,
      constants,
      createRequire,
      enableCompileCache,
      findSourceMap,
      getCompileCacheDir,
      globalPaths,
      isBuiltin,
      register,
      runMain,
      syncBuiltinESMExports,
      wrap,
      wrapper,
      flushCompileCache,
      stripTypeScriptTypes,
      findPackageJSON,
      getSourceMapsSupport,
      setSourceMapsSupport
    };
  }
});

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/module.mjs
var module_exports = {};
__export(module_exports, {
  Module: () => Module2,
  SourceMap: () => SourceMap,
  _cache: () => _cache,
  _debug: () => _debug,
  _extensions: () => _extensions,
  _findPath: () => _findPath,
  _initPaths: () => _initPaths,
  _load: () => _load,
  _nodeModulePaths: () => _nodeModulePaths,
  _pathCache: () => _pathCache,
  _preloadModules: () => _preloadModules,
  _resolveFilename: () => _resolveFilename,
  _resolveLookupPaths: () => _resolveLookupPaths,
  builtinModules: () => builtinModules,
  constants: () => constants,
  createRequire: () => createRequire2,
  default: () => module_default,
  enableCompileCache: () => enableCompileCache,
  findSourceMap: () => findSourceMap,
  getCompileCacheDir: () => getCompileCacheDir,
  globalPaths: () => globalPaths,
  isBuiltin: () => isBuiltin,
  register: () => register,
  runMain: () => runMain,
  syncBuiltinESMExports: () => syncBuiltinESMExports,
  wrap: () => wrap
});
var workerdModule, createRequire2, module_default;
var init_module2 = __esm({
  "node_modules/@cloudflare/unenv-preset/dist/runtime/node/module.mjs"() {
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    init_module();
    init_module();
    workerdModule = process.getBuiltinModule("node:module");
    createRequire2 = /* @__PURE__ */ __name((file) => {
      return Object.assign(workerdModule.createRequire(file), {
        resolve: Object.assign(
          /* @__PURE__ */ notImplemented("module.require.resolve"),
          {
            paths: /* @__PURE__ */ notImplemented("module.require.resolve.paths")
          }
        ),
        cache: /* @__PURE__ */ Object.create(null),
        extensions: _extensions,
        main: void 0
      });
    }, "createRequire");
    module_default = {
      Module: Module2,
      SourceMap,
      _cache,
      _extensions,
      _debug,
      _pathCache,
      _findPath,
      _initPaths,
      _load,
      _nodeModulePaths,
      _preloadModules,
      _resolveFilename,
      _resolveLookupPaths,
      builtinModules,
      enableCompileCache,
      constants,
      createRequire: createRequire2,
      findSourceMap,
      getCompileCacheDir,
      globalPaths,
      isBuiltin,
      register,
      runMain,
      syncBuiltinESMExports,
      wrap
    };
  }
});

// worker.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/hono.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/hono-base.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/compose.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context2, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i2) {
      if (i2 <= index) {
        throw new Error("next() called multiple times");
      }
      index = i2;
      let res;
      let isError = false;
      let handler;
      if (middleware[i2]) {
        handler = middleware[i2][0][0];
        context2.req.routeIndex = i2;
      } else {
        handler = i2 === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context2, () => dispatch(i2 + 1));
        } catch (err2) {
          if (err2 instanceof Error && onError) {
            context2.error = err2;
            res = await onError(err2, context2);
            isError = true;
          } else {
            throw err2;
          }
        }
      } else {
        if (context2.finalized === false && onNotFound) {
          res = await onNotFound(context2);
        }
      }
      if (res && (context2.finalized === false || isError)) {
        context2.res = res;
      }
      return context2;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/context.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/request.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/http-exception.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/request/constants.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i2 = groups.length - 1; i2 >= 0; i2--) {
    const [mark] = groups[i2];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i2][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start2 = url.indexOf("/", url.indexOf(":") + 4);
  let i2 = start2;
  for (; i2 < url.length; i2++) {
    const charCode = url.charCodeAt(i2);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i2);
      const path = url.slice(start2, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start2, i2);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i2, a2) => a2.indexOf(v) === i2);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name2 = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name2 = _decodeURI(name2);
    }
    keyIndex = nextKeyIndex;
    if (name2 === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name2] && Array.isArray(results[name2]))) {
        results[name2] = [];
      }
      ;
      results[name2].push(value);
    } else {
      results[name2] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = /* @__PURE__ */ __name(class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name2) {
    if (name2) {
      return this.raw.headers.get(name2) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body2) => {
        if (anyCachedKey === "json") {
          body2 = JSON.stringify(body2);
        }
        return new Response(body2)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
}, "HonoRequest");

// node_modules/hono/dist/utils/html.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context2, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c3) => c3({ phase, buffer, context: context2 }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context2, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = /* @__PURE__ */ __name(class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k2, v] of this.#res.headers.entries()) {
        if (k2 === "content-type") {
          continue;
        }
        if (k2 === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k2, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args2) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args2);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name2, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name2);
    } else if (options?.append) {
      headers.append(name2, value);
    } else {
      headers.set(name2, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k2, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k2, v);
        } else {
          responseHeaders.delete(k2);
          for (const v2 of v) {
            responseHeaders.append(k2, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = (...args2) => this.#newResponse(...args2);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location2, status) => {
    const locationString = String(location2);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  };
}, "Context");

// node_modules/hono/dist/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = /* @__PURE__ */ __name(class extends Error {
}, "UnsupportedPathError");

// node_modules/hono/dist/utils/constants.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c3) => {
  return c3.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err2, c3) => {
  if ("getResponse" in err2) {
    const res = err2.getResponse();
    return c3.newResponse(res.body, res);
  }
  console.error(err2);
  return c3.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = /* @__PURE__ */ __name(class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args2) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args2.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p3 of [path].flat()) {
        this.#path = p3;
        for (const m3 of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m3.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c3, next) => (await compose([], app2.errorHandler)(c3, () => r.handler(c3, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c3) => {
      const options2 = optionHandler(c3);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c3) => {
      let executionContext = void 0;
      try {
        executionContext = c3.executionCtx;
      } catch {
      }
      return [c3.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c3, next) => {
      const res = await applicationHandler(replaceRequest(c3.req.raw), ...getOptions(c3));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err2, c3) {
    if (err2 instanceof Error) {
      return this.errorHandler(err2, c3);
    }
    throw err2;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c3 = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c3, async () => {
          c3.res = await this.#notFoundHandler(c3);
        });
      } catch (err2) {
        return this.#handleError(err2, c3);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c3.finalized ? c3.res : this.#notFoundHandler(c3))
      ).catch((err2) => this.#handleError(err2, c3)) : res ?? this.#notFoundHandler(c3);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context2 = await composed(c3);
        if (!context2.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context2.res;
      } catch (err2) {
        return this.#handleError(err2, c3);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
}, "_Hono");

// node_modules/hono/dist/router/reg-exp-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/reg-exp-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/reg-exp-router/matcher.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }, "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a2, b3) {
  if (a2.length === 1) {
    return b3.length === 1 ? a2 < b3 ? -1 : 1 : -1;
  }
  if (b3.length === 1) {
    return 1;
  }
  if (a2 === ONLY_WILDCARD_REG_EXP_STR || a2 === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b3 === ONLY_WILDCARD_REG_EXP_STR || b3 === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a2 === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b3 === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a2.length === b3.length ? a2 < b3 ? -1 : 1 : b3.length - a2.length;
}
__name(compareKey, "compareKey");
var Node = /* @__PURE__ */ __name(class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context2, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name2 = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name2 && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k2) => k2 !== ONLY_WILDCARD_REG_EXP_STR && k2 !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name2 !== "") {
          node.#varIndex = context2.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name2 !== "") {
        paramMap.push([name2, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k2) => k2.length > 1 && k2 !== ONLY_WILDCARD_REG_EXP_STR && k2 !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context2, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k2) => {
      const c3 = this.#children[k2];
      return (typeof c3.#varIndex === "number" ? `(${k2})@${c3.#varIndex}` : regExpMetaChars.has(k2) ? `\\${k2}` : k2) + c3.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
}, "_Node");

// node_modules/hono/dist/router/reg-exp-router/trie.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var Trie = /* @__PURE__ */ __name(class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i2 = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m3) => {
        const mark = `@\\${i2}`;
        groups[i2] = [mark, m3];
        i2++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i2 = groups.length - 1; i2 >= 0; i2--) {
      const [mark] = groups[i2];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i2][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
}, "Trie");

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i2 = 0, j = -1, len = routesWithStaticPathFlag.length; i2 < len; i2++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i2];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h3]) => [h3, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h3, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h3, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i2 = 0, len = handlerData.length; i2 < len; i2++) {
    for (let j = 0, len2 = handlerData[i2].length; j < len2; j++) {
      const map = handlerData[i2][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k2 = 0, len3 = keys.length; k2 < len3; k2++) {
        map[keys[k2]] = paramReplacementMap[map[keys[k2]]];
      }
    }
  }
  const handlerMap = [];
  for (const i2 in indexReplacementMap) {
    handlerMap[i2] = handlerData[indexReplacementMap[i2]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k2 of Object.keys(middleware).sort((a2, b3) => b3.length - a2.length)) {
    if (buildWildcardRegExp(k2).test(path)) {
      return [...middleware[k2]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = /* @__PURE__ */ __name(class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p3) => {
          handlerMap[method][p3] = [...handlerMap[METHOD_NAME_ALL][p3]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re2 = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m3) => {
          middleware[m3][path] ||= findMiddleware(middleware[m3], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m3) => {
        if (method === METHOD_NAME_ALL || method === m3) {
          Object.keys(middleware[m3]).forEach((p3) => {
            re2.test(p3) && middleware[m3][p3].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m3) => {
        if (method === METHOD_NAME_ALL || method === m3) {
          Object.keys(routes[m3]).forEach(
            (p3) => re2.test(p3) && routes[m3][p3].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i2 = 0, len = paths.length; i2 < len; i2++) {
      const path2 = paths[i2];
      Object.keys(routes).forEach((m3) => {
        if (method === METHOD_NAME_ALL || method === m3) {
          routes[m3][path2] ||= [
            ...findMiddleware(middleware[m3], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m3][path2].push([handler, paramCount - len + i2 + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
}, "RegExpRouter");

// node_modules/hono/dist/router/reg-exp-router/prepared-router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/smart-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/smart-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var SmartRouter = /* @__PURE__ */ __name(class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init2) {
    this.#routers = init2.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i2 = 0;
    let res;
    for (; i2 < len; i2++) {
      const router = routers[i2];
      try {
        for (let i22 = 0, len2 = routes.length; i22 < len2; i22++) {
          router.add(...routes[i22]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i2 === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
}, "SmartRouter");

// node_modules/hono/dist/router/trie-router/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/trie-router/router.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/hono/dist/router/trie-router/node.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = /* @__PURE__ */ __name(class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m3 = /* @__PURE__ */ Object.create(null);
      m3[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m3];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts2 = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i2 = 0, len = parts2.length; i2 < len; i2++) {
      const p3 = parts2[i2];
      const nextP = parts2[i2 + 1];
      const pattern = getPattern(p3, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p3;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i2, a2) => a2.indexOf(v) === i2),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i2 = 0, len = node.#methods.length; i2 < len; i2++) {
      const m3 = node.#methods[i2];
      const handlerSet = m3[method] || m3[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i22 = 0, len2 = handlerSet.possibleKeys.length; i22 < len2; i22++) {
            const key = handlerSet.possibleKeys[i22];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts2 = splitPath(path);
    const curNodesQueue = [];
    for (let i2 = 0, len = parts2.length; i2 < len; i2++) {
      const part = parts2[i2];
      const isLast = i2 === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k2 = 0, len3 = node.#patterns.length; k2 < len3; k2++) {
          const pattern = node.#patterns[k2];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name2, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts2.slice(i2).join("/");
          if (matcher instanceof RegExp) {
            const m3 = matcher.exec(restPathString);
            if (m3) {
              params[name2] = m3[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m3[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name2] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a2, b3) => {
        return a2.score - b3.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
}, "_Node");

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = /* @__PURE__ */ __name(class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i2 = 0, len = results.length; i2 < len; i2++) {
        this.#node.insert(method, results[i2], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
}, "TrieRouter");

// node_modules/hono/dist/hono.js
var Hono2 = /* @__PURE__ */ __name(class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
}, "Hono");

// src/pglite-local.ts
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/async-mutex/index.mjs
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var E_TIMEOUT = new Error("timeout while waiting for mutex to become available");
var E_ALREADY_LOCKED = new Error("mutex already locked");
var E_CANCELED = new Error("request for lock canceled");
var __awaiter$2 = function(thisArg, _arguments, P2, generator) {
  function adopt(value) {
    return value instanceof P2 ? value : new P2(function(resolve) {
      resolve(value);
    });
  }
  __name(adopt, "adopt");
  return new (P2 || (P2 = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    __name(fulfilled, "fulfilled");
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    __name(rejected, "rejected");
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    __name(step, "step");
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var Semaphore = class {
  constructor(_value, _cancelError = E_CANCELED) {
    this._value = _value;
    this._cancelError = _cancelError;
    this._queue = [];
    this._weightedWaiters = [];
  }
  acquire(weight = 1, priority = 0) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    return new Promise((resolve, reject) => {
      const task = { resolve, reject, weight, priority };
      const i2 = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
      if (i2 === -1 && weight <= this._value) {
        this._dispatchItem(task);
      } else {
        this._queue.splice(i2 + 1, 0, task);
      }
    });
  }
  runExclusive(callback_1) {
    return __awaiter$2(this, arguments, void 0, function* (callback, weight = 1, priority = 0) {
      const [value, release2] = yield this.acquire(weight, priority);
      try {
        return yield callback(value);
      } finally {
        release2();
      }
    });
  }
  waitForUnlock(weight = 1, priority = 0) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    if (this._couldLockImmediately(weight, priority)) {
      return Promise.resolve();
    } else {
      return new Promise((resolve) => {
        if (!this._weightedWaiters[weight - 1])
          this._weightedWaiters[weight - 1] = [];
        insertSorted(this._weightedWaiters[weight - 1], { resolve, priority });
      });
    }
  }
  isLocked() {
    return this._value <= 0;
  }
  getValue() {
    return this._value;
  }
  setValue(value) {
    this._value = value;
    this._dispatchQueue();
  }
  release(weight = 1) {
    if (weight <= 0)
      throw new Error(`invalid weight ${weight}: must be positive`);
    this._value += weight;
    this._dispatchQueue();
  }
  cancel() {
    this._queue.forEach((entry) => entry.reject(this._cancelError));
    this._queue = [];
  }
  _dispatchQueue() {
    this._drainUnlockWaiters();
    while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
      this._dispatchItem(this._queue.shift());
      this._drainUnlockWaiters();
    }
  }
  _dispatchItem(item) {
    const previousValue = this._value;
    this._value -= item.weight;
    item.resolve([previousValue, this._newReleaser(item.weight)]);
  }
  _newReleaser(weight) {
    let called = false;
    return () => {
      if (called)
        return;
      called = true;
      this.release(weight);
    };
  }
  _drainUnlockWaiters() {
    if (this._queue.length === 0) {
      for (let weight = this._value; weight > 0; weight--) {
        const waiters = this._weightedWaiters[weight - 1];
        if (!waiters)
          continue;
        waiters.forEach((waiter) => waiter.resolve());
        this._weightedWaiters[weight - 1] = [];
      }
    } else {
      const queuedPriority = this._queue[0].priority;
      for (let weight = this._value; weight > 0; weight--) {
        const waiters = this._weightedWaiters[weight - 1];
        if (!waiters)
          continue;
        const i2 = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
        (i2 === -1 ? waiters : waiters.splice(0, i2)).forEach((waiter) => waiter.resolve());
      }
    }
  }
  _couldLockImmediately(weight, priority) {
    return (this._queue.length === 0 || this._queue[0].priority < priority) && weight <= this._value;
  }
};
__name(Semaphore, "Semaphore");
function insertSorted(a2, v) {
  const i2 = findIndexFromEnd(a2, (other) => v.priority <= other.priority);
  a2.splice(i2 + 1, 0, v);
}
__name(insertSorted, "insertSorted");
function findIndexFromEnd(a2, predicate) {
  for (let i2 = a2.length - 1; i2 >= 0; i2--) {
    if (predicate(a2[i2])) {
      return i2;
    }
  }
  return -1;
}
__name(findIndexFromEnd, "findIndexFromEnd");
var __awaiter$1 = function(thisArg, _arguments, P2, generator) {
  function adopt(value) {
    return value instanceof P2 ? value : new P2(function(resolve) {
      resolve(value);
    });
  }
  __name(adopt, "adopt");
  return new (P2 || (P2 = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    __name(fulfilled, "fulfilled");
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    __name(rejected, "rejected");
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    __name(step, "step");
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var Mutex = class {
  constructor(cancelError) {
    this._semaphore = new Semaphore(1, cancelError);
  }
  acquire() {
    return __awaiter$1(this, arguments, void 0, function* (priority = 0) {
      const [, releaser] = yield this._semaphore.acquire(1, priority);
      return releaser;
    });
  }
  runExclusive(callback, priority = 0) {
    return this._semaphore.runExclusive(() => callback(), 1, priority);
  }
  isLocked() {
    return this._semaphore.isLocked();
  }
  waitForUnlock(priority = 0) {
    return this._semaphore.waitForUnlock(1, priority);
  }
  release() {
    if (this._semaphore.isLocked())
      this._semaphore.release();
  }
  cancel() {
    return this._semaphore.cancel();
  }
};
__name(Mutex, "Mutex");

// node_modules/@dotdo/pg-protocol/dist/index.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// node_modules/@dotdo/pg-protocol/dist/chunk-YSY43NBI.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var C = Object.defineProperty;
var D = /* @__PURE__ */ __name((t, e) => {
  for (var n in e)
    C(t, n, { get: e[n], enumerable: true });
}, "D");
var P = {};
D(P, { AuthenticationCleartextPassword: () => l, AuthenticationMD5Password: () => s, AuthenticationOk: () => a, AuthenticationSASL: () => o, AuthenticationSASLContinue: () => c, AuthenticationSASLFinal: () => u, BackendKeyDataMessage: () => h, CommandCompleteMessage: () => k, CopyDataMessage: () => p, CopyResponse: () => m, DataRowMessage: () => B, DatabaseError: () => d, Field: () => b, NoticeMessage: () => S, NotificationResponseMessage: () => x, ParameterDescriptionMessage: () => y, ParameterStatusMessage: () => f, ReadyForQueryMessage: () => M, RowDescriptionMessage: () => g, bindComplete: () => w, closeComplete: () => A, copyDone: () => O, emptyQuery: () => L, noData: () => T, parseComplete: () => N, portalSuspended: () => I, replicationStart: () => Q });
var N = { name: "parseComplete", length: 5 };
var w = { name: "bindComplete", length: 5 };
var A = { name: "closeComplete", length: 5 };
var T = { name: "noData", length: 5 };
var I = { name: "portalSuspended", length: 5 };
var Q = { name: "replicationStart", length: 4 };
var L = { name: "emptyQuery", length: 4 };
var O = { name: "copyDone", length: 4 };
var a = /* @__PURE__ */ __name(class {
  constructor(e) {
    this.length = e;
  }
  name = "authenticationOk";
}, "a");
var l = /* @__PURE__ */ __name(class {
  constructor(e) {
    this.length = e;
  }
  name = "authenticationCleartextPassword";
}, "l");
var s = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.salt = n;
  }
  name = "authenticationMD5Password";
}, "s");
var o = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.mechanisms = n;
  }
  name = "authenticationSASL";
}, "o");
var c = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.data = n;
  }
  name = "authenticationSASLContinue";
}, "c");
var u = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.data = n;
  }
  name = "authenticationSASLFinal";
}, "u");
var d = /* @__PURE__ */ __name(class extends Error {
  constructor(n, i2, r) {
    super(n);
    this.length = i2;
    this.name = r;
  }
  severity;
  code;
  detail;
  hint;
  position;
  internalPosition;
  internalQuery;
  where;
  schema;
  table;
  column;
  dataType;
  constraint;
  file;
  line;
  routine;
}, "d");
var p = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.chunk = n;
  }
  name = "copyData";
}, "p");
var m = /* @__PURE__ */ __name(class {
  constructor(e, n, i2, r) {
    this.length = e;
    this.name = n;
    this.binary = i2;
    this.columnTypes = new Array(r);
  }
  columnTypes;
}, "m");
var b = /* @__PURE__ */ __name(class {
  constructor(e, n, i2, r, v, E, F) {
    this.name = e;
    this.tableID = n;
    this.columnID = i2;
    this.dataTypeID = r;
    this.dataTypeSize = v;
    this.dataTypeModifier = E;
    this.format = F;
  }
}, "b");
var g = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.fieldCount = n;
    this.fields = new Array(this.fieldCount);
  }
  name = "rowDescription";
  fields;
}, "g");
var y = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.parameterCount = n;
    this.dataTypeIDs = new Array(this.parameterCount);
  }
  name = "parameterDescription";
  dataTypeIDs;
}, "y");
var f = /* @__PURE__ */ __name(class {
  constructor(e, n, i2) {
    this.length = e;
    this.parameterName = n;
    this.parameterValue = i2;
  }
  name = "parameterStatus";
}, "f");
var h = /* @__PURE__ */ __name(class {
  constructor(e, n, i2) {
    this.length = e;
    this.processID = n;
    this.secretKey = i2;
  }
  name = "backendKeyData";
}, "h");
var x = /* @__PURE__ */ __name(class {
  constructor(e, n, i2, r) {
    this.length = e;
    this.processId = n;
    this.channel = i2;
    this.payload = r;
  }
  name = "notification";
}, "x");
var M = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.status = n;
  }
  name = "readyForQuery";
}, "M");
var k = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.text = n;
  }
  name = "commandComplete";
}, "k");
var B = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.fields = n;
    this.fieldCount = n.length;
  }
  fieldCount;
  name = "dataRow";
}, "B");
var S = /* @__PURE__ */ __name(class {
  constructor(e, n) {
    this.length = e;
    this.message = n;
  }
  name = "notice";
  severity;
  code;
  detail;
  hint;
  position;
  internalPosition;
  internalQuery;
  where;
  schema;
  table;
  column;
  dataType;
  constraint;
  file;
  line;
  routine;
}, "S");

// node_modules/@dotdo/pg-protocol/dist/index.js
function h2(s2) {
  let e = s2.length;
  for (let t = s2.length - 1; t >= 0; t--) {
    let r = s2.charCodeAt(t);
    r > 127 && r <= 2047 ? e++ : r > 2047 && r <= 65535 && (e += 2), r >= 56320 && r <= 57343 && t--;
  }
  return e;
}
__name(h2, "h");
var l2 = /* @__PURE__ */ __name(class {
  constructor(e = 256) {
    this.size = e;
    this.#r = this.#i(e);
  }
  #r;
  #t = 5;
  #n = false;
  #e = new TextEncoder();
  #s = 0;
  #i(e) {
    return new DataView(new ArrayBuffer(e));
  }
  #a(e) {
    if (this.#r.byteLength - this.#t < e) {
      let r = this.#r.buffer, n = r.byteLength + (r.byteLength >> 1) + e;
      this.#r = this.#i(n), new Uint8Array(this.#r.buffer).set(new Uint8Array(r));
    }
  }
  addInt32(e) {
    return this.#a(4), this.#r.setInt32(this.#t, e, this.#n), this.#t += 4, this;
  }
  addInt16(e) {
    return this.#a(2), this.#r.setInt16(this.#t, e, this.#n), this.#t += 2, this;
  }
  addCString(e) {
    return e && this.addString(e), this.#a(1), this.#r.setUint8(this.#t, 0), this.#t++, this;
  }
  addString(e = "") {
    let t = h2(e);
    return this.#a(t), this.#e.encodeInto(e, new Uint8Array(this.#r.buffer, this.#t)), this.#t += t, this;
  }
  add(e) {
    return this.#a(e.byteLength), new Uint8Array(this.#r.buffer).set(new Uint8Array(e), this.#t), this.#t += e.byteLength, this;
  }
  #u(e) {
    if (e) {
      this.#r.setUint8(this.#s, e);
      let t = this.#t - (this.#s + 1);
      this.#r.setInt32(this.#s + 1, t, this.#n);
    }
    return this.#r.buffer.slice(e ? 0 : 5, this.#t);
  }
  flush(e) {
    let t = this.#u(e);
    return this.#t = 5, this.#r = this.#i(this.size), new Uint8Array(t);
  }
}, "l");
var o2 = new l2();
var ee = /* @__PURE__ */ __name((s2) => {
  o2.addInt16(3).addInt16(0);
  for (let r of Object.keys(s2))
    o2.addCString(r).addCString(s2[r]);
  o2.addCString("client_encoding").addCString("UTF8");
  let e = o2.addCString("").flush(), t = e.byteLength + 4;
  return new l2().addInt32(t).add(e.buffer.slice(e.byteOffset, e.byteOffset + e.byteLength)).flush();
}, "ee");
var te = /* @__PURE__ */ __name(() => {
  let s2 = new DataView(new ArrayBuffer(8));
  return s2.setInt32(0, 8, false), s2.setInt32(4, 80877103, false), new Uint8Array(s2.buffer);
}, "te");
var re = /* @__PURE__ */ __name((s2) => o2.addCString(s2).flush(112), "re");
var ne = /* @__PURE__ */ __name((s2, e) => (o2.addCString(s2).addInt32(h2(e)).addString(e), o2.flush(112)), "ne");
var se = /* @__PURE__ */ __name((s2) => o2.addString(s2).flush(112), "se");
var ie = /* @__PURE__ */ __name((s2) => o2.addCString(s2).flush(81), "ie");
var ae = [];
var ue = /* @__PURE__ */ __name((s2) => {
  let e = s2.name ?? "";
  e.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", e, e.length), console.error("This can cause conflicts and silent errors executing queries"));
  let t = o2.addCString(e).addCString(s2.text).addInt16(s2.types?.length ?? 0);
  return s2.types?.forEach((r) => t.addInt32(r)), o2.flush(80);
}, "ue");
var d2 = new l2();
var oe = /* @__PURE__ */ __name((s2, e) => {
  for (let t = 0; t < s2.length; t++) {
    let r = e ? e(s2[t], t) : s2[t];
    if (r === null)
      o2.addInt16(0), d2.addInt32(-1);
    else if (r instanceof ArrayBuffer || ArrayBuffer.isView(r)) {
      let n = ArrayBuffer.isView(r) ? r.buffer.slice(r.byteOffset, r.byteOffset + r.byteLength) : r;
      o2.addInt16(1), d2.addInt32(n.byteLength), d2.add(n);
    } else
      o2.addInt16(0), d2.addInt32(h2(r)), d2.addString(r);
  }
}, "oe");
var fe = /* @__PURE__ */ __name((s2 = {}) => {
  let e = s2.portal ?? "", t = s2.statement ?? "", r = s2.binary ?? false, n = s2.values ?? ae, i2 = n.length;
  o2.addCString(e).addCString(t), o2.addInt16(i2), oe(n, s2.valueMapper), o2.addInt16(i2);
  let a2 = d2.flush();
  return o2.add(a2.buffer.slice(a2.byteOffset, a2.byteOffset + a2.byteLength)), o2.addInt16(r ? 1 : 0), o2.flush(66);
}, "fe");
var ce = new Uint8Array([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
var le = /* @__PURE__ */ __name((s2) => {
  if (!s2 || !s2.portal && !s2.rows)
    return ce;
  let e = s2.portal ?? "", t = s2.rows ?? 0, r = h2(e), n = 4 + r + 1 + 4, i2 = new DataView(new ArrayBuffer(1 + n));
  return i2.setUint8(0, 69), i2.setInt32(1, n, false), new TextEncoder().encodeInto(e, new Uint8Array(i2.buffer, 5)), i2.setUint8(r + 5, 0), i2.setUint32(i2.byteLength - 4, t, false), new Uint8Array(i2.buffer);
}, "le");
var he = /* @__PURE__ */ __name((s2, e) => {
  let t = new DataView(new ArrayBuffer(16));
  return t.setInt32(0, 16, false), t.setInt16(4, 1234, false), t.setInt16(6, 5678, false), t.setInt32(8, s2, false), t.setInt32(12, e, false), new Uint8Array(t.buffer);
}, "he");
var g2 = /* @__PURE__ */ __name((s2, e) => {
  let t = new l2();
  return t.addCString(e), t.flush(s2);
}, "g");
var de = o2.addCString("P").flush(68);
var ye = o2.addCString("S").flush(68);
var pe = /* @__PURE__ */ __name((s2) => s2.name ? g2(68, `${s2.type}${s2.name ?? ""}`) : s2.type === "P" ? de : ye, "pe");
var me = /* @__PURE__ */ __name((s2) => {
  let e = `${s2.type}${s2.name ?? ""}`;
  return g2(67, e);
}, "me");
var be = /* @__PURE__ */ __name((s2) => o2.add(s2).flush(100), "be");
var we = /* @__PURE__ */ __name((s2) => g2(102, s2), "we");
var p2 = /* @__PURE__ */ __name((s2) => new Uint8Array([s2, 0, 0, 0, 4]), "p");
var ge = p2(72);
var xe = p2(83);
var Ae = p2(88);
var Be = p2(99);
var De = { startup: ee, password: re, requestSsl: te, sendSASLInitialResponseMessage: ne, sendSCRAMClientFinalMessage: se, query: ie, parse: ue, bind: fe, execute: le, describe: pe, close: me, flush: () => ge, sync: () => xe, end: () => Ae, copyData: be, copyDone: () => Be, copyFail: we, cancel: he };
var x2 = { text: 0, binary: 1 };
var Ie = new ArrayBuffer(0);
var c2 = /* @__PURE__ */ __name(class extends Error {
  constructor(e) {
    super(e), this.name = "BufferValidationError";
  }
}, "c");
function X(s2) {
  let e = 0;
  for (; e < s2.length; ) {
    let t = s2[e];
    if (t === void 0)
      return false;
    if (t <= 127)
      e++;
    else if ((t & 224) === 192) {
      if (t < 194 || e + 1 >= s2.length)
        return false;
      let r = s2[e + 1];
      if (r === void 0 || (r & 192) !== 128)
        return false;
      e += 2;
    } else if ((t & 240) === 224) {
      if (e + 2 >= s2.length)
        return false;
      let r = s2[e + 1], n = s2[e + 2];
      if (r === void 0 || n === void 0 || (r & 192) !== 128 || (n & 192) !== 128 || t === 224 && r < 160 || t === 237 && r >= 160)
        return false;
      e += 3;
    } else if ((t & 248) === 240) {
      if (t > 244 || e + 3 >= s2.length)
        return false;
      let r = s2[e + 1], n = s2[e + 2], i2 = s2[e + 3];
      if (r === void 0 || n === void 0 || i2 === void 0 || (r & 192) !== 128 || (n & 192) !== 128 || (i2 & 192) !== 128 || t === 240 && r < 144 || t === 244 && r > 143)
        return false;
      e += 4;
    } else
      return false;
  }
  return true;
}
__name(X, "X");
var m2 = /* @__PURE__ */ __name(class {
  #r = new DataView(Ie);
  #t;
  #n = 0;
  #e = "utf-8";
  #s = new TextDecoder(this.#e);
  #i = false;
  constructor(e = 0) {
    this.#t = e;
  }
  setBuffer(e, t, r) {
    this.#t = e, this.#r = new DataView(t), this.#n = r !== void 0 ? e + (r - 4) : t.byteLength;
  }
  remainingBytes() {
    return this.#n - this.#t;
  }
  int16() {
    let e = this.#r.getInt16(this.#t, this.#i);
    return this.#t += 2, e;
  }
  byte() {
    let e = this.#r.getUint8(this.#t);
    return this.#t++, e;
  }
  int32() {
    let e = this.#r.getInt32(this.#t, this.#i);
    return this.#t += 4, e;
  }
  string(e, t = false) {
    let r = this.bytes(e);
    if (t && !X(r))
      throw new c2("Invalid UTF-8 sequence");
    return this.#s.decode(r);
  }
  stringValidated(e) {
    if (e < 0)
      throw new c2("Negative string length");
    if (this.#t + e > this.#n)
      throw new c2("String length exceeds message bounds");
    return this.string(e, true);
  }
  cstring() {
    let e = this.#t, t = e;
    for (; this.#r.getUint8(t++) !== 0; )
      ;
    let r = this.string(t - e - 1);
    return this.#t = t, r;
  }
  cstringValidated() {
    let e = this.#t, t = e;
    for (; t < this.#n; ) {
      if (this.#r.getUint8(t) === 0) {
        let r = new Uint8Array(this.#r.buffer, e, t - e);
        if (!X(r))
          throw new c2("Invalid UTF-8 sequence in cstring");
        let n = this.#s.decode(r);
        return this.#t = t + 1, n;
      }
      t++;
    }
    throw new c2("Missing null terminator in cstring");
  }
  bytes(e) {
    let t = this.#r.buffer.slice(this.#t, this.#t + e);
    return this.#t += e, new Uint8Array(t);
  }
}, "m");
var B2 = 1;
var Ue = 4;
var A2 = B2 + Ue;
var b2 = 1664;
var J = new ArrayBuffer(0);
var D2 = /* @__PURE__ */ __name(class {
  #r = new DataView(J);
  #t = 0;
  #n = 0;
  #e = new m2();
  parse(e, t) {
    this.#s(ArrayBuffer.isView(e) ? e.buffer.slice(e.byteOffset, e.byteOffset + e.byteLength) : e);
    let r = this.#n + this.#t, n = this.#n;
    for (; n + A2 <= r; ) {
      let i2 = this.#r.getUint8(n), a2 = this.#r.getInt32(n + B2, false);
      if (a2 < 4) {
        t(new d(`Invalid message length: ${a2} (minimum is 4)`, a2, "error")), n += A2;
        continue;
      }
      let f2 = B2 + a2;
      if (f2 + n <= r) {
        let u2 = this.#i(n + A2, i2, a2, this.#r.buffer);
        t(u2), n += f2;
      } else
        break;
    }
    n === r ? (this.#r = new DataView(J), this.#t = 0, this.#n = 0) : (this.#t = r - n, this.#n = n);
  }
  #s(e) {
    if (this.#t > 0) {
      let t = this.#t + e.byteLength;
      if (t + this.#n > this.#r.byteLength) {
        let n;
        if (t <= this.#r.byteLength && this.#n >= this.#t)
          n = this.#r.buffer;
        else {
          let i2 = this.#r.byteLength * 2;
          for (; t >= i2; )
            i2 *= 2;
          n = new ArrayBuffer(i2);
        }
        new Uint8Array(n).set(new Uint8Array(this.#r.buffer, this.#n, this.#t)), this.#r = new DataView(n), this.#n = 0;
      }
      new Uint8Array(this.#r.buffer).set(new Uint8Array(e), this.#n + this.#t), this.#t = t;
    } else
      this.#r = new DataView(e), this.#n = 0, this.#t = e.byteLength;
  }
  #i(e, t, r, n) {
    try {
      switch (t) {
        case 50:
          return w;
        case 49:
          return N;
        case 51:
          return A;
        case 110:
          return T;
        case 115:
          return I;
        case 99:
          return O;
        case 87:
          return Q;
        case 73:
          return L;
        case 68:
          return this.#b(e, r, n);
        case 67:
          return this.#u(e, r, n);
        case 90:
          return this.#a(e, r, n);
        case 65:
          return this.#d(e, r, n);
        case 82:
          return this.#x(e, r, n);
        case 83:
          return this.#w(e, r, n);
        case 75:
          return this.#g(e, r, n);
        case 69:
          return this.#f(e, r, n, "error");
        case 78:
          return this.#f(e, r, n, "notice");
        case 84:
          return this.#y(e, r, n);
        case 116:
          return this.#m(e, r, n);
        case 71:
          return this.#l(e, r, n);
        case 72:
          return this.#h(e, r, n);
        case 100:
          return this.#c(e, r, n);
        default:
          return new d("received invalid response: " + t.toString(16), r, "error");
      }
    } catch (i2) {
      if (i2 instanceof c2)
        return new d(`Malformed message: ${i2.message}`, r, "error");
      throw i2;
    }
  }
  #a(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.string(1);
    return new M(t, n);
  }
  #u(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.cstringValidated();
    return new k(t, n);
  }
  #c(e, t, r) {
    let n = r.slice(e, e + (t - 4));
    return new p(t, new Uint8Array(n));
  }
  #l(e, t, r) {
    return this.#o(e, t, r, "copyInResponse");
  }
  #h(e, t, r) {
    return this.#o(e, t, r, "copyOutResponse");
  }
  #o(e, t, r, n) {
    this.#e.setBuffer(e, r, t);
    let i2 = this.#e.byte() !== 0, a2 = this.#e.int16(), f2 = t - 4 - 1 - 2, u2 = a2 * 2;
    if (a2 < 0 || u2 > f2)
      throw new c2(`Invalid column count ${a2}: requires ${u2} bytes but only ${f2} available`);
    let I2 = new m(t, n, i2, a2);
    for (let w2 = 0; w2 < a2; w2++)
      I2.columnTypes[w2] = this.#e.int16();
    return I2;
  }
  #d(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.int32(), i2 = this.#e.cstringValidated(), a2 = this.#e.cstringValidated();
    return new x(t, n, i2, a2);
  }
  #y(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.int16();
    if (n < 0 || n > b2)
      throw new c2(`Invalid field count: ${n} (must be 0-${b2})`);
    let i2 = 19, a2 = t - 4 - 2;
    if (n > 0 && n * i2 > a2)
      throw new c2(`Field count ${n} exceeds available message data`);
    let f2 = new g(t, n);
    for (let u2 = 0; u2 < n; u2++)
      f2.fields[u2] = this.#p();
    return f2;
  }
  #p() {
    let e = this.#e.cstringValidated(), t = this.#e.int32(), r = this.#e.int16(), n = this.#e.int32(), i2 = this.#e.int16(), a2 = this.#e.int32(), f2 = this.#e.int16() === 0 ? x2.text : x2.binary;
    return new b(e, t, r, n, i2, a2, f2);
  }
  #m(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.int16(), i2 = new y(t, n);
    for (let a2 = 0; a2 < n; a2++)
      i2.dataTypeIDs[a2] = this.#e.int32();
    return i2;
  }
  #b(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.int16();
    if (n < 0 || n > b2)
      throw new c2(`Invalid field count: ${n} (must be 0-${b2})`);
    let i2 = new Array(n);
    for (let a2 = 0; a2 < n; a2++) {
      let f2 = this.#e.int32();
      if (f2 === -1)
        i2[a2] = null;
      else {
        if (f2 < 0)
          throw new c2(`Invalid field length: ${f2}`);
        i2[a2] = this.#e.stringValidated(f2);
      }
    }
    return new B(t, i2);
  }
  #w(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.cstringValidated(), i2 = this.#e.cstringValidated();
    return new f(t, n, i2);
  }
  #g(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.int32(), i2 = this.#e.int32();
    return new h(t, n, i2);
  }
  #x(e, t, r) {
    this.#e.setBuffer(e, r, t);
    let n = this.#e.int32();
    switch (n) {
      case 0:
        return new a(t);
      case 3:
        return new l(t);
      case 5:
        return new s(t, this.#e.bytes(4));
      case 10: {
        let i2 = [];
        for (; ; ) {
          let a2 = this.#e.cstring();
          if (a2.length === 0)
            return new o(t, i2);
          i2.push(a2);
        }
      }
      case 11:
        return new c(t, this.#e.string(t - 8));
      case 12:
        return new u(t, this.#e.string(t - 8));
      default:
        throw new Error("Unknown authenticationOk message type " + n);
    }
  }
  #f(e, t, r, n) {
    this.#e.setBuffer(e, r, t);
    let i2 = {}, a2 = this.#e.string(1);
    for (; a2 !== "\0"; ) {
      if (this.#e.remainingBytes() < 1)
        throw new c2("Malformed error message: missing field terminator");
      if (i2[a2] = this.#e.cstringValidated(), this.#e.remainingBytes() < 1)
        throw new c2("Malformed error message: missing final terminator");
      a2 = this.#e.string(1);
    }
    let f2 = i2.M ?? "", u2 = n === "notice" ? new S(t, f2) : new d(f2, t, n);
    return u2.severity = i2.S, u2.code = i2.C, u2.detail = i2.D, u2.hint = i2.H, u2.position = i2.P, u2.internalPosition = i2.p, u2.internalQuery = i2.q, u2.where = i2.W, u2.schema = i2.s, u2.table = i2.t, u2.column = i2.c, u2.dataType = i2.d, u2.constraint = i2.n, u2.file = i2.F, u2.line = i2.L, u2.routine = i2.R, u2;
  }
}, "D");

// src/pglite-patched/pglite-workers.js
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var Module3 = (() => {
  var _scriptName = "";
  return async function(moduleArg = {}) {
    var moduleRtn;
    var Module = moduleArg;
    var readyPromiseResolve, readyPromiseReject;
    var readyPromise = new Promise((resolve, reject) => {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer" && typeof globalThis.caches === "undefined";
    if (ENVIRONMENT_IS_NODE && typeof globalThis.caches === "undefined") {
      const { createRequire: createRequire3 } = await Promise.resolve().then(() => (init_module2(), module_exports));
      let dirname = "/";
      if (dirname.startsWith("data:")) {
        dirname = "/";
      }
      var require = createRequire3(dirname);
    }
    Module["expectedDataFileDownloads"] ??= 0;
    Module["expectedDataFileDownloads"]++;
    (() => {
      var isPthread = typeof ENVIRONMENT_IS_PTHREAD != "undefined" && ENVIRONMENT_IS_PTHREAD;
      var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != "undefined" && ENVIRONMENT_IS_WASM_WORKER;
      if (isPthread || isWasmWorker)
        return;
      var isNode = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string" && typeof globalThis.caches === "undefined";
      function loadPackage(metadata2) {
        var PACKAGE_PATH = "";
        if (typeof window === "object") {
          PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")) + "/");
        } else if (typeof process === "undefined" && typeof location !== "undefined") {
          PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf("/")) + "/");
        }
        var PACKAGE_NAME = "pglite.data";
        var REMOTE_PACKAGE_BASE = "pglite.data";
        var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
        var REMOTE_PACKAGE_SIZE = metadata2["remote_package_size"];
        function fetchRemotePackage(packageName, packageSize, callback, errback) {
          if (isNode && typeof globalThis.caches === "undefined") {
            require("fs").readFile(packageName, (err2, contents) => {
              if (err2) {
                errback(err2);
              } else {
                callback(contents.buffer);
              }
            });
            return;
          }
          Module["dataFileDownloads"] ??= {};
          fetch(packageName).catch((cause) => Promise.reject(new Error(`Network Error: ${packageName}`, { cause }))).then((response) => {
            if (!response.ok) {
              return Promise.reject(new Error(`${response.status}: ${response.url}`));
            }
            if (!response.body && response.arrayBuffer) {
              return response.arrayBuffer().then(callback);
            }
            const reader = response.body.getReader();
            const iterate = /* @__PURE__ */ __name(() => reader.read().then(handleChunk).catch((cause) => Promise.reject(new Error(`Unexpected error while handling : ${response.url} ${cause}`, { cause }))), "iterate");
            const chunks = [];
            const headers = response.headers;
            const total = Number(headers.get("Content-Length") ?? packageSize);
            let loaded = 0;
            const handleChunk = /* @__PURE__ */ __name(({ done, value }) => {
              if (!done) {
                chunks.push(value);
                loaded += value.length;
                Module["dataFileDownloads"][packageName] = { loaded, total };
                let totalLoaded = 0;
                let totalSize = 0;
                for (const download of Object.values(Module["dataFileDownloads"])) {
                  totalLoaded += download.loaded;
                  totalSize += download.total;
                }
                Module["setStatus"]?.(`Downloading data... (${totalLoaded}/${totalSize})`);
                return iterate();
              } else {
                const packageData = new Uint8Array(chunks.map((c3) => c3.length).reduce((a2, b3) => a2 + b3, 0));
                let offset = 0;
                for (const chunk of chunks) {
                  packageData.set(chunk, offset);
                  offset += chunk.length;
                }
                callback(packageData.buffer);
              }
            }, "handleChunk");
            Module["setStatus"]?.("Downloading data...");
            return iterate();
          });
        }
        __name(fetchRemotePackage, "fetchRemotePackage");
        function handleError(error3) {
          console.error("package error:", error3);
        }
        __name(handleError, "handleError");
        var fetchedCallback = null;
        var fetched = Module["getPreloadedPackage"] ? Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;
        if (!fetched)
          fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, (data) => {
            if (fetchedCallback) {
              fetchedCallback(data);
              fetchedCallback = null;
            } else {
              fetched = data;
            }
          }, handleError);
        function runWithFS(Module4) {
          function assert4(check, msg) {
            if (!check)
              throw msg + new Error().stack;
          }
          __name(assert4, "assert");
          Module4["FS_createPath"]("/", "home", true, true);
          Module4["FS_createPath"]("/home", "web_user", true, true);
          Module4["FS_createPath"]("/", "tmp", true, true);
          Module4["FS_createPath"]("/tmp", "pglite", true, true);
          Module4["FS_createPath"]("/tmp/pglite", "bin", true, true);
          Module4["FS_createPath"]("/tmp/pglite", "lib", true, true);
          Module4["FS_createPath"]("/tmp/pglite/lib", "postgresql", true, true);
          Module4["FS_createPath"]("/tmp/pglite/lib/postgresql", "pgxs", true, true);
          Module4["FS_createPath"]("/tmp/pglite/lib/postgresql/pgxs", "config", true, true);
          Module4["FS_createPath"]("/tmp/pglite/lib/postgresql/pgxs", "src", true, true);
          Module4["FS_createPath"]("/tmp/pglite/lib/postgresql/pgxs/src", "makefiles", true, true);
          Module4["FS_createPath"]("/tmp/pglite", "share", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share", "postgresql", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql", "extension", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql", "timezone", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Africa", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "America", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone/America", "Argentina", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone/America", "Indiana", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone/America", "Kentucky", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone/America", "North_Dakota", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Antarctica", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Arctic", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Asia", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Atlantic", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Australia", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Brazil", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Canada", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Chile", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Etc", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Europe", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Indian", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Mexico", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "Pacific", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql/timezone", "US", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql", "timezonesets", true, true);
          Module4["FS_createPath"]("/tmp/pglite/share/postgresql", "tsearch_data", true, true);
          function DataRequest(start2, end, audio) {
            this.start = start2;
            this.end = end;
            this.audio = audio;
          }
          __name(DataRequest, "DataRequest");
          DataRequest.prototype = { requests: {}, open: function(mode, name2) {
            this.name = name2;
            this.requests[name2] = this;
            Module4["addRunDependency"](`fp ${this.name}`);
          }, send: function() {
          }, onload: function() {
            var byteArray = this.byteArray.subarray(this.start, this.end);
            this.finish(byteArray);
          }, finish: function(byteArray) {
            var that = this;
            Module4["FS_createDataFile"](this.name, null, byteArray, true, true, true);
            Module4["removeRunDependency"](`fp ${that.name}`);
            this.requests[this.name] = null;
          } };
          var files = metadata2["files"];
          for (var i2 = 0; i2 < files.length; ++i2) {
            new DataRequest(files[i2]["start"], files[i2]["end"], files[i2]["audio"] || 0).open("GET", files[i2]["filename"]);
          }
          function processPackageData(arrayBuffer) {
            assert4(arrayBuffer, "Loading data file failed.");
            assert4(arrayBuffer.constructor.name === ArrayBuffer.name, "bad input to processPackageData");
            var byteArray = new Uint8Array(arrayBuffer);
            DataRequest.prototype.byteArray = byteArray;
            var files2 = metadata2["files"];
            for (var i3 = 0; i3 < files2.length; ++i3) {
              DataRequest.prototype.requests[files2[i3].filename].onload();
            }
            Module4["removeRunDependency"]("datafile_pglite.data");
          }
          __name(processPackageData, "processPackageData");
          Module4["addRunDependency"]("datafile_pglite.data");
          Module4["preloadResults"] ??= {};
          Module4["preloadResults"][PACKAGE_NAME] = { fromCache: false };
          if (fetched) {
            processPackageData(fetched);
            fetched = null;
          } else {
            fetchedCallback = processPackageData;
          }
        }
        __name(runWithFS, "runWithFS");
        if (Module["calledRun"]) {
          runWithFS(Module);
        } else {
          (Module["preRun"] ??= []).push(runWithFS);
        }
      }
      __name(loadPackage, "loadPackage");
      loadPackage({ files: [{ filename: "/home/web_user/.pgpass", start: 0, end: 204 }, { filename: "/tmp/pglite/bin/initdb", start: 204, end: 223 }, { filename: "/tmp/pglite/bin/postgres", start: 223, end: 242 }, { filename: "/tmp/pglite/lib/postgresql/cyrillic_and_mic.so", start: 242, end: 3908 }, { filename: "/tmp/pglite/lib/postgresql/dict_snowball.so", start: 3908, end: 569724 }, { filename: "/tmp/pglite/lib/postgresql/euc2004_sjis2004.so", start: 569724, end: 571582 }, { filename: "/tmp/pglite/lib/postgresql/euc_cn_and_mic.so", start: 571582, end: 572500 }, { filename: "/tmp/pglite/lib/postgresql/euc_jp_and_sjis.so", start: 572500, end: 579558 }, { filename: "/tmp/pglite/lib/postgresql/euc_kr_and_mic.so", start: 579558, end: 580483 }, { filename: "/tmp/pglite/lib/postgresql/euc_tw_and_big5.so", start: 580483, end: 584735 }, { filename: "/tmp/pglite/lib/postgresql/latin2_and_win1250.so", start: 584735, end: 586106 }, { filename: "/tmp/pglite/lib/postgresql/latin_and_mic.so", start: 586106, end: 586939 }, { filename: "/tmp/pglite/lib/postgresql/libpqwalreceiver.so", start: 586939, end: 692200 }, { filename: "/tmp/pglite/lib/postgresql/pgoutput.so", start: 692200, end: 704680 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/config/install-sh", start: 704680, end: 718677 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/config/missing", start: 718677, end: 720025 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/Makefile.global", start: 720025, end: 756822 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/Makefile.port", start: 756822, end: 757675 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/Makefile.shlib", start: 757675, end: 773103 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/makefiles/pgxs.mk", start: 773103, end: 789068 }, { filename: "/tmp/pglite/lib/postgresql/pgxs/src/nls-global.mk", start: 789068, end: 795936 }, { filename: "/tmp/pglite/lib/postgresql/plpgsql.so", start: 795936, end: 927509 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_big5.so", start: 927509, end: 1042258 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_cyrillic.so", start: 1042258, end: 1048136 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc2004.so", start: 1048136, end: 1253069 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc_cn.so", start: 1253069, end: 1328250 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc_jp.so", start: 1328250, end: 1479479 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc_kr.so", start: 1479479, end: 1582336 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_euc_tw.so", start: 1582336, end: 1781893 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_gb18030.so", start: 1781893, end: 2042648 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_gbk.so", start: 2042648, end: 2189181 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_iso8859.so", start: 2189181, end: 2212305 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_iso8859_1.so", start: 2212305, end: 2213239 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_johab.so", start: 2213239, end: 2374944 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_sjis.so", start: 2374944, end: 2456605 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_sjis2004.so", start: 2456605, end: 2583238 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_uhc.so", start: 2583238, end: 2750511 }, { filename: "/tmp/pglite/lib/postgresql/utf8_and_win.so", start: 2750511, end: 2776667 }, { filename: "/tmp/pglite/password", start: 2776667, end: 2776676 }, { filename: "/tmp/pglite/share/postgresql/errcodes.txt", start: 2776676, end: 2810068 }, { filename: "/tmp/pglite/share/postgresql/extension/plpgsql--1.0.sql", start: 2810068, end: 2810726 }, { filename: "/tmp/pglite/share/postgresql/extension/plpgsql.control", start: 2810726, end: 2810919 }, { filename: "/tmp/pglite/share/postgresql/information_schema.sql", start: 2810919, end: 2926442 }, { filename: "/tmp/pglite/share/postgresql/pg_hba.conf.sample", start: 2926442, end: 2932067 }, { filename: "/tmp/pglite/share/postgresql/pg_ident.conf.sample", start: 2932067, end: 2934707 }, { filename: "/tmp/pglite/share/postgresql/pg_service.conf.sample", start: 2934707, end: 2935311 }, { filename: "/tmp/pglite/share/postgresql/postgres.bki", start: 2935311, end: 3888579 }, { filename: "/tmp/pglite/share/postgresql/postgresql.conf.sample", start: 3888579, end: 3919241 }, { filename: "/tmp/pglite/share/postgresql/psqlrc.sample", start: 3919241, end: 3919519 }, { filename: "/tmp/pglite/share/postgresql/snowball_create.sql", start: 3919519, end: 3963695 }, { filename: "/tmp/pglite/share/postgresql/sql_features.txt", start: 3963695, end: 3999428 }, { filename: "/tmp/pglite/share/postgresql/system_constraints.sql", start: 3999428, end: 4008323 }, { filename: "/tmp/pglite/share/postgresql/system_functions.sql", start: 4008323, end: 4032626 }, { filename: "/tmp/pglite/share/postgresql/system_views.sql", start: 4032626, end: 4084320 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Abidjan", start: 4084320, end: 4084468 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Accra", start: 4084468, end: 4084616 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Addis_Ababa", start: 4084616, end: 4084881 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Algiers", start: 4084881, end: 4085616 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Asmara", start: 4085616, end: 4085881 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Asmera", start: 4085881, end: 4086146 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Bamako", start: 4086146, end: 4086294 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Bangui", start: 4086294, end: 4086529 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Banjul", start: 4086529, end: 4086677 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Bissau", start: 4086677, end: 4086871 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Blantyre", start: 4086871, end: 4087020 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Brazzaville", start: 4087020, end: 4087255 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Bujumbura", start: 4087255, end: 4087404 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Cairo", start: 4087404, end: 4089803 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Casablanca", start: 4089803, end: 4092232 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Ceuta", start: 4092232, end: 4094284 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Conakry", start: 4094284, end: 4094432 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Dakar", start: 4094432, end: 4094580 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Dar_es_Salaam", start: 4094580, end: 4094845 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Djibouti", start: 4094845, end: 4095110 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Douala", start: 4095110, end: 4095345 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/El_Aaiun", start: 4095345, end: 4097640 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Freetown", start: 4097640, end: 4097788 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Gaborone", start: 4097788, end: 4097937 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Harare", start: 4097937, end: 4098086 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Johannesburg", start: 4098086, end: 4098332 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Juba", start: 4098332, end: 4099011 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Kampala", start: 4099011, end: 4099276 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Khartoum", start: 4099276, end: 4099955 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Kigali", start: 4099955, end: 4100104 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Kinshasa", start: 4100104, end: 4100339 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Lagos", start: 4100339, end: 4100574 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Libreville", start: 4100574, end: 4100809 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Lome", start: 4100809, end: 4100957 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Luanda", start: 4100957, end: 4101192 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Lubumbashi", start: 4101192, end: 4101341 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Lusaka", start: 4101341, end: 4101490 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Malabo", start: 4101490, end: 4101725 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Maputo", start: 4101725, end: 4101874 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Maseru", start: 4101874, end: 4102120 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Mbabane", start: 4102120, end: 4102366 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Mogadishu", start: 4102366, end: 4102631 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Monrovia", start: 4102631, end: 4102839 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Nairobi", start: 4102839, end: 4103104 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Ndjamena", start: 4103104, end: 4103303 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Niamey", start: 4103303, end: 4103538 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Nouakchott", start: 4103538, end: 4103686 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Ouagadougou", start: 4103686, end: 4103834 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Porto-Novo", start: 4103834, end: 4104069 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Sao_Tome", start: 4104069, end: 4104323 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Timbuktu", start: 4104323, end: 4104471 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Tripoli", start: 4104471, end: 4105096 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Tunis", start: 4105096, end: 4105785 }, { filename: "/tmp/pglite/share/postgresql/timezone/Africa/Windhoek", start: 4105785, end: 4106740 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Adak", start: 4106740, end: 4109096 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Anchorage", start: 4109096, end: 4111467 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Anguilla", start: 4111467, end: 4111713 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Antigua", start: 4111713, end: 4111959 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Araguaina", start: 4111959, end: 4112843 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Buenos_Aires", start: 4112843, end: 4113919 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Catamarca", start: 4113919, end: 4114995 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/ComodRivadavia", start: 4114995, end: 4116071 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Cordoba", start: 4116071, end: 4117147 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Jujuy", start: 4117147, end: 4118195 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/La_Rioja", start: 4118195, end: 4119285 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Mendoza", start: 4119285, end: 4120361 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Rio_Gallegos", start: 4120361, end: 4121437 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Salta", start: 4121437, end: 4122485 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/San_Juan", start: 4122485, end: 4123575 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/San_Luis", start: 4123575, end: 4124677 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Tucuman", start: 4124677, end: 4125781 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Argentina/Ushuaia", start: 4125781, end: 4126857 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Aruba", start: 4126857, end: 4127103 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Asuncion", start: 4127103, end: 4128761 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Atikokan", start: 4128761, end: 4128943 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Atka", start: 4128943, end: 4131299 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Bahia", start: 4131299, end: 4132323 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Bahia_Banderas", start: 4132323, end: 4133423 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Barbados", start: 4133423, end: 4133859 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Belem", start: 4133859, end: 4134435 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Belize", start: 4134435, end: 4136049 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Blanc-Sablon", start: 4136049, end: 4136295 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Boa_Vista", start: 4136295, end: 4136927 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Bogota", start: 4136927, end: 4137173 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Boise", start: 4137173, end: 4139583 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Buenos_Aires", start: 4139583, end: 4140659 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cambridge_Bay", start: 4140659, end: 4142913 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Campo_Grande", start: 4142913, end: 4144357 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cancun", start: 4144357, end: 4145221 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Caracas", start: 4145221, end: 4145485 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Catamarca", start: 4145485, end: 4146561 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cayenne", start: 4146561, end: 4146759 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cayman", start: 4146759, end: 4146941 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Chicago", start: 4146941, end: 4150533 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Chihuahua", start: 4150533, end: 4151635 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Ciudad_Juarez", start: 4151635, end: 4153173 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Coral_Harbour", start: 4153173, end: 4153355 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cordoba", start: 4153355, end: 4154431 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Costa_Rica", start: 4154431, end: 4154747 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Coyhaique", start: 4154747, end: 4156887 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Creston", start: 4156887, end: 4157247 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Cuiaba", start: 4157247, end: 4158663 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Curacao", start: 4158663, end: 4158909 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Danmarkshavn", start: 4158909, end: 4159607 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Dawson", start: 4159607, end: 4161221 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Dawson_Creek", start: 4161221, end: 4162271 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Denver", start: 4162271, end: 4164731 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Detroit", start: 4164731, end: 4166961 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Dominica", start: 4166961, end: 4167207 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Edmonton", start: 4167207, end: 4169539 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Eirunepe", start: 4169539, end: 4170195 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/El_Salvador", start: 4170195, end: 4170419 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Ensenada", start: 4170419, end: 4172877 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Fort_Nelson", start: 4172877, end: 4175117 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Fort_Wayne", start: 4175117, end: 4176799 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Fortaleza", start: 4176799, end: 4177515 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Glace_Bay", start: 4177515, end: 4179707 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Godthab", start: 4179707, end: 4181610 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Goose_Bay", start: 4181610, end: 4184820 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Grand_Turk", start: 4184820, end: 4186654 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Grenada", start: 4186654, end: 4186900 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Guadeloupe", start: 4186900, end: 4187146 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Guatemala", start: 4187146, end: 4187426 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Guayaquil", start: 4187426, end: 4187672 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Guyana", start: 4187672, end: 4187934 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Halifax", start: 4187934, end: 4191358 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Havana", start: 4191358, end: 4193774 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Hermosillo", start: 4193774, end: 4194162 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Indianapolis", start: 4194162, end: 4195844 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Knox", start: 4195844, end: 4198288 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Marengo", start: 4198288, end: 4200026 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Petersburg", start: 4200026, end: 4201946 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Tell_City", start: 4201946, end: 4203646 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Vevay", start: 4203646, end: 4205076 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Vincennes", start: 4205076, end: 4206786 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indiana/Winamac", start: 4206786, end: 4208580 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Indianapolis", start: 4208580, end: 4210262 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Inuvik", start: 4210262, end: 4212336 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Iqaluit", start: 4212336, end: 4214538 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Jamaica", start: 4214538, end: 4215020 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Jujuy", start: 4215020, end: 4216068 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Juneau", start: 4216068, end: 4218421 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Kentucky/Louisville", start: 4218421, end: 4221209 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Kentucky/Monticello", start: 4221209, end: 4223577 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Knox_IN", start: 4223577, end: 4226021 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Kralendijk", start: 4226021, end: 4226267 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/La_Paz", start: 4226267, end: 4226499 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Lima", start: 4226499, end: 4226905 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Los_Angeles", start: 4226905, end: 4229757 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Louisville", start: 4229757, end: 4232545 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Lower_Princes", start: 4232545, end: 4232791 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Maceio", start: 4232791, end: 4233535 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Managua", start: 4233535, end: 4233965 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Manaus", start: 4233965, end: 4234569 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Marigot", start: 4234569, end: 4234815 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Martinique", start: 4234815, end: 4235047 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Matamoros", start: 4235047, end: 4236465 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Mazatlan", start: 4236465, end: 4237525 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Mendoza", start: 4237525, end: 4238601 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Menominee", start: 4238601, end: 4240875 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Merida", start: 4240875, end: 4241879 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Metlakatla", start: 4241879, end: 4243302 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Mexico_City", start: 4243302, end: 4244524 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Miquelon", start: 4244524, end: 4246190 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Moncton", start: 4246190, end: 4249344 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Monterrey", start: 4249344, end: 4250458 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Montevideo", start: 4250458, end: 4251968 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Montreal", start: 4251968, end: 4255462 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Montserrat", start: 4255462, end: 4255708 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Nassau", start: 4255708, end: 4259202 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/New_York", start: 4259202, end: 4262754 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Nipigon", start: 4262754, end: 4266248 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Nome", start: 4266248, end: 4268615 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Noronha", start: 4268615, end: 4269331 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/North_Dakota/Beulah", start: 4269331, end: 4271727 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/North_Dakota/Center", start: 4271727, end: 4274123 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/North_Dakota/New_Salem", start: 4274123, end: 4276519 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Nuuk", start: 4276519, end: 4278422 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Ojinaga", start: 4278422, end: 4279946 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Panama", start: 4279946, end: 4280128 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Pangnirtung", start: 4280128, end: 4282330 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Paramaribo", start: 4282330, end: 4282592 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Phoenix", start: 4282592, end: 4282952 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Port-au-Prince", start: 4282952, end: 4284386 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Port_of_Spain", start: 4284386, end: 4284632 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Porto_Acre", start: 4284632, end: 4285260 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Porto_Velho", start: 4285260, end: 4285836 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Puerto_Rico", start: 4285836, end: 4286082 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Punta_Arenas", start: 4286082, end: 4287998 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Rainy_River", start: 4287998, end: 4290866 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Rankin_Inlet", start: 4290866, end: 4292932 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Recife", start: 4292932, end: 4293648 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Regina", start: 4293648, end: 4294628 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Resolute", start: 4294628, end: 4296694 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Rio_Branco", start: 4296694, end: 4297322 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Rosario", start: 4297322, end: 4298398 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Santa_Isabel", start: 4298398, end: 4300856 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Santarem", start: 4300856, end: 4301458 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Santiago", start: 4301458, end: 4303987 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Santo_Domingo", start: 4303987, end: 4304445 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Sao_Paulo", start: 4304445, end: 4305889 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Scoresbysund", start: 4305889, end: 4307838 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Shiprock", start: 4307838, end: 4310298 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Sitka", start: 4310298, end: 4312627 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Barthelemy", start: 4312627, end: 4312873 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Johns", start: 4312873, end: 4316528 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Kitts", start: 4316528, end: 4316774 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Lucia", start: 4316774, end: 4317020 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Thomas", start: 4317020, end: 4317266 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/St_Vincent", start: 4317266, end: 4317512 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Swift_Current", start: 4317512, end: 4318072 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Tegucigalpa", start: 4318072, end: 4318324 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Thule", start: 4318324, end: 4319826 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Thunder_Bay", start: 4319826, end: 4323320 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Tijuana", start: 4323320, end: 4325778 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Toronto", start: 4325778, end: 4329272 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Tortola", start: 4329272, end: 4329518 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Vancouver", start: 4329518, end: 4332410 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Virgin", start: 4332410, end: 4332656 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Whitehorse", start: 4332656, end: 4334270 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Winnipeg", start: 4334270, end: 4337138 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Yakutat", start: 4337138, end: 4339443 }, { filename: "/tmp/pglite/share/postgresql/timezone/America/Yellowknife", start: 4339443, end: 4341775 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Casey", start: 4341775, end: 4342212 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Davis", start: 4342212, end: 4342509 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/DumontDUrville", start: 4342509, end: 4342695 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Macquarie", start: 4342695, end: 4344955 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Mawson", start: 4344955, end: 4345154 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/McMurdo", start: 4345154, end: 4347591 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Palmer", start: 4347591, end: 4349009 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Rothera", start: 4349009, end: 4349173 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/South_Pole", start: 4349173, end: 4351610 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Syowa", start: 4351610, end: 4351775 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Troll", start: 4351775, end: 4352937 }, { filename: "/tmp/pglite/share/postgresql/timezone/Antarctica/Vostok", start: 4352937, end: 4353164 }, { filename: "/tmp/pglite/share/postgresql/timezone/Arctic/Longyearbyen", start: 4353164, end: 4355462 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Aden", start: 4355462, end: 4355627 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Almaty", start: 4355627, end: 4356624 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Amman", start: 4356624, end: 4358071 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Anadyr", start: 4358071, end: 4359259 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Aqtau", start: 4359259, end: 4360242 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Aqtobe", start: 4360242, end: 4361253 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ashgabat", start: 4361253, end: 4361872 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ashkhabad", start: 4361872, end: 4362491 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Atyrau", start: 4362491, end: 4363482 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Baghdad", start: 4363482, end: 4364465 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Bahrain", start: 4364465, end: 4364664 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Baku", start: 4364664, end: 4365891 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Bangkok", start: 4365891, end: 4366090 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Barnaul", start: 4366090, end: 4367311 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Beirut", start: 4367311, end: 4369465 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Bishkek", start: 4369465, end: 4370448 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Brunei", start: 4370448, end: 4370931 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Calcutta", start: 4370931, end: 4371216 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Chita", start: 4371216, end: 4372437 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Choibalsan", start: 4372437, end: 4373328 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Chongqing", start: 4373328, end: 4373889 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Chungking", start: 4373889, end: 4374450 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Colombo", start: 4374450, end: 4374822 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dacca", start: 4374822, end: 4375159 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Damascus", start: 4375159, end: 4377046 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dhaka", start: 4377046, end: 4377383 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dili", start: 4377383, end: 4377654 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dubai", start: 4377654, end: 4377819 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Dushanbe", start: 4377819, end: 4378410 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Famagusta", start: 4378410, end: 4380438 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Gaza", start: 4380438, end: 4384282 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Harbin", start: 4384282, end: 4384843 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Hebron", start: 4384843, end: 4388715 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ho_Chi_Minh", start: 4388715, end: 4389066 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Hong_Kong", start: 4389066, end: 4390299 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Hovd", start: 4390299, end: 4391190 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Irkutsk", start: 4391190, end: 4392433 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Istanbul", start: 4392433, end: 4394380 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Jakarta", start: 4394380, end: 4394763 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Jayapura", start: 4394763, end: 4394984 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Jerusalem", start: 4394984, end: 4397372 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kabul", start: 4397372, end: 4397580 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kamchatka", start: 4397580, end: 4398746 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Karachi", start: 4398746, end: 4399125 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kashgar", start: 4399125, end: 4399290 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kathmandu", start: 4399290, end: 4399502 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Katmandu", start: 4399502, end: 4399714 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Khandyga", start: 4399714, end: 4400985 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kolkata", start: 4400985, end: 4401270 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Krasnoyarsk", start: 4401270, end: 4402477 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kuala_Lumpur", start: 4402477, end: 4402892 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kuching", start: 4402892, end: 4403375 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Kuwait", start: 4403375, end: 4403540 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Macao", start: 4403540, end: 4404767 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Macau", start: 4404767, end: 4405994 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Magadan", start: 4405994, end: 4407216 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Makassar", start: 4407216, end: 4407470 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Manila", start: 4407470, end: 4407892 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Muscat", start: 4407892, end: 4408057 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Nicosia", start: 4408057, end: 4410059 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Novokuznetsk", start: 4410059, end: 4411224 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Novosibirsk", start: 4411224, end: 4412445 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Omsk", start: 4412445, end: 4413652 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Oral", start: 4413652, end: 4414657 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Phnom_Penh", start: 4414657, end: 4414856 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Pontianak", start: 4414856, end: 4415209 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Pyongyang", start: 4415209, end: 4415446 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Qatar", start: 4415446, end: 4415645 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Qostanay", start: 4415645, end: 4416684 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Qyzylorda", start: 4416684, end: 4417709 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Rangoon", start: 4417709, end: 4417977 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Riyadh", start: 4417977, end: 4418142 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Saigon", start: 4418142, end: 4418493 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Sakhalin", start: 4418493, end: 4419695 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Samarkand", start: 4419695, end: 4420272 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Seoul", start: 4420272, end: 4420889 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Shanghai", start: 4420889, end: 4421450 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Singapore", start: 4421450, end: 4421865 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Srednekolymsk", start: 4421865, end: 4423073 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Taipei", start: 4423073, end: 4423834 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tashkent", start: 4423834, end: 4424425 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tbilisi", start: 4424425, end: 4425460 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tehran", start: 4425460, end: 4426722 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tel_Aviv", start: 4426722, end: 4429110 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Thimbu", start: 4429110, end: 4429313 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Thimphu", start: 4429313, end: 4429516 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tokyo", start: 4429516, end: 4429825 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Tomsk", start: 4429825, end: 4431046 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ujung_Pandang", start: 4431046, end: 4431300 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ulaanbaatar", start: 4431300, end: 4432191 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ulan_Bator", start: 4432191, end: 4433082 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Urumqi", start: 4433082, end: 4433247 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Ust-Nera", start: 4433247, end: 4434499 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Vientiane", start: 4434499, end: 4434698 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Vladivostok", start: 4434698, end: 4435906 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Yakutsk", start: 4435906, end: 4437113 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Yangon", start: 4437113, end: 4437381 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Yekaterinburg", start: 4437381, end: 4438624 }, { filename: "/tmp/pglite/share/postgresql/timezone/Asia/Yerevan", start: 4438624, end: 4439775 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Azores", start: 4439775, end: 4443231 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Bermuda", start: 4443231, end: 4445627 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Canary", start: 4445627, end: 4447524 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Cape_Verde", start: 4447524, end: 4447794 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Faeroe", start: 4447794, end: 4449609 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Faroe", start: 4449609, end: 4451424 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Jan_Mayen", start: 4451424, end: 4453722 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Madeira", start: 4453722, end: 4457099 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Reykjavik", start: 4457099, end: 4457247 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/South_Georgia", start: 4457247, end: 4457411 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/St_Helena", start: 4457411, end: 4457559 }, { filename: "/tmp/pglite/share/postgresql/timezone/Atlantic/Stanley", start: 4457559, end: 4458773 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/ACT", start: 4458773, end: 4460963 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Adelaide", start: 4460963, end: 4463171 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Brisbane", start: 4463171, end: 4463590 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Broken_Hill", start: 4463590, end: 4465819 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Canberra", start: 4465819, end: 4468009 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Currie", start: 4468009, end: 4470367 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Darwin", start: 4470367, end: 4470692 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Eucla", start: 4470692, end: 4471162 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Hobart", start: 4471162, end: 4473520 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/LHI", start: 4473520, end: 4475380 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Lindeman", start: 4475380, end: 4475855 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Lord_Howe", start: 4475855, end: 4477715 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Melbourne", start: 4477715, end: 4479905 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/NSW", start: 4479905, end: 4482095 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/North", start: 4482095, end: 4482420 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Perth", start: 4482420, end: 4482866 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Queensland", start: 4482866, end: 4483285 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/South", start: 4483285, end: 4485493 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Sydney", start: 4485493, end: 4487683 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Tasmania", start: 4487683, end: 4490041 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Victoria", start: 4490041, end: 4492231 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/West", start: 4492231, end: 4492677 }, { filename: "/tmp/pglite/share/postgresql/timezone/Australia/Yancowinna", start: 4492677, end: 4494906 }, { filename: "/tmp/pglite/share/postgresql/timezone/Brazil/Acre", start: 4494906, end: 4495534 }, { filename: "/tmp/pglite/share/postgresql/timezone/Brazil/DeNoronha", start: 4495534, end: 4496250 }, { filename: "/tmp/pglite/share/postgresql/timezone/Brazil/East", start: 4496250, end: 4497694 }, { filename: "/tmp/pglite/share/postgresql/timezone/Brazil/West", start: 4497694, end: 4498298 }, { filename: "/tmp/pglite/share/postgresql/timezone/CET", start: 4498298, end: 4501231 }, { filename: "/tmp/pglite/share/postgresql/timezone/CST6CDT", start: 4501231, end: 4504823 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Atlantic", start: 4504823, end: 4508247 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Central", start: 4508247, end: 4511115 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Eastern", start: 4511115, end: 4514609 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Mountain", start: 4514609, end: 4516941 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Newfoundland", start: 4516941, end: 4520596 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Pacific", start: 4520596, end: 4523488 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Saskatchewan", start: 4523488, end: 4524468 }, { filename: "/tmp/pglite/share/postgresql/timezone/Canada/Yukon", start: 4524468, end: 4526082 }, { filename: "/tmp/pglite/share/postgresql/timezone/Chile/Continental", start: 4526082, end: 4528611 }, { filename: "/tmp/pglite/share/postgresql/timezone/Chile/EasterIsland", start: 4528611, end: 4530844 }, { filename: "/tmp/pglite/share/postgresql/timezone/Cuba", start: 4530844, end: 4533260 }, { filename: "/tmp/pglite/share/postgresql/timezone/EET", start: 4533260, end: 4535522 }, { filename: "/tmp/pglite/share/postgresql/timezone/EST", start: 4535522, end: 4535704 }, { filename: "/tmp/pglite/share/postgresql/timezone/EST5EDT", start: 4535704, end: 4539256 }, { filename: "/tmp/pglite/share/postgresql/timezone/Egypt", start: 4539256, end: 4541655 }, { filename: "/tmp/pglite/share/postgresql/timezone/Eire", start: 4541655, end: 4545147 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT", start: 4545147, end: 4545261 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+0", start: 4545261, end: 4545375 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+1", start: 4545375, end: 4545491 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+10", start: 4545491, end: 4545608 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+11", start: 4545608, end: 4545725 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+12", start: 4545725, end: 4545842 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+2", start: 4545842, end: 4545958 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+3", start: 4545958, end: 4546074 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+4", start: 4546074, end: 4546190 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+5", start: 4546190, end: 4546306 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+6", start: 4546306, end: 4546422 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+7", start: 4546422, end: 4546538 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+8", start: 4546538, end: 4546654 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT+9", start: 4546654, end: 4546770 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-0", start: 4546770, end: 4546884 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-1", start: 4546884, end: 4547001 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-10", start: 4547001, end: 4547119 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-11", start: 4547119, end: 4547237 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-12", start: 4547237, end: 4547355 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-13", start: 4547355, end: 4547473 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-14", start: 4547473, end: 4547591 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-2", start: 4547591, end: 4547708 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-3", start: 4547708, end: 4547825 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-4", start: 4547825, end: 4547942 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-5", start: 4547942, end: 4548059 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-6", start: 4548059, end: 4548176 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-7", start: 4548176, end: 4548293 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-8", start: 4548293, end: 4548410 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT-9", start: 4548410, end: 4548527 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/GMT0", start: 4548527, end: 4548641 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/Greenwich", start: 4548641, end: 4548755 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/UCT", start: 4548755, end: 4548869 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/UTC", start: 4548869, end: 4548983 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/Universal", start: 4548983, end: 4549097 }, { filename: "/tmp/pglite/share/postgresql/timezone/Etc/Zulu", start: 4549097, end: 4549211 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Amsterdam", start: 4549211, end: 4552144 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Andorra", start: 4552144, end: 4553886 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Astrakhan", start: 4553886, end: 4555051 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Athens", start: 4555051, end: 4557313 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Belfast", start: 4557313, end: 4560977 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Belgrade", start: 4560977, end: 4562897 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Berlin", start: 4562897, end: 4565195 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Bratislava", start: 4565195, end: 4567496 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Brussels", start: 4567496, end: 4570429 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Bucharest", start: 4570429, end: 4572613 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Budapest", start: 4572613, end: 4574981 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Busingen", start: 4574981, end: 4576890 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Chisinau", start: 4576890, end: 4579280 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Copenhagen", start: 4579280, end: 4581578 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Dublin", start: 4581578, end: 4585070 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Gibraltar", start: 4585070, end: 4588138 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Guernsey", start: 4588138, end: 4591802 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Helsinki", start: 4591802, end: 4593702 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Isle_of_Man", start: 4593702, end: 4597366 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Istanbul", start: 4597366, end: 4599313 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Jersey", start: 4599313, end: 4602977 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Kaliningrad", start: 4602977, end: 4604470 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Kiev", start: 4604470, end: 4606590 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Kirov", start: 4606590, end: 4607775 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Kyiv", start: 4607775, end: 4609895 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Lisbon", start: 4609895, end: 4613422 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Ljubljana", start: 4613422, end: 4615342 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/London", start: 4615342, end: 4619006 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Luxembourg", start: 4619006, end: 4621939 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Madrid", start: 4621939, end: 4624553 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Malta", start: 4624553, end: 4627173 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Mariehamn", start: 4627173, end: 4629073 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Minsk", start: 4629073, end: 4630394 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Monaco", start: 4630394, end: 4633356 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Moscow", start: 4633356, end: 4634891 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Nicosia", start: 4634891, end: 4636893 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Oslo", start: 4636893, end: 4639191 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Paris", start: 4639191, end: 4642153 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Podgorica", start: 4642153, end: 4644073 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Prague", start: 4644073, end: 4646374 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Riga", start: 4646374, end: 4648572 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Rome", start: 4648572, end: 4651213 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Samara", start: 4651213, end: 4652428 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/San_Marino", start: 4652428, end: 4655069 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Sarajevo", start: 4655069, end: 4656989 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Saratov", start: 4656989, end: 4658172 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Simferopol", start: 4658172, end: 4659641 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Skopje", start: 4659641, end: 4661561 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Sofia", start: 4661561, end: 4663638 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Stockholm", start: 4663638, end: 4665936 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Tallinn", start: 4665936, end: 4668084 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Tirane", start: 4668084, end: 4670168 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Tiraspol", start: 4670168, end: 4672558 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Ulyanovsk", start: 4672558, end: 4673825 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Uzhgorod", start: 4673825, end: 4675945 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Vaduz", start: 4675945, end: 4677854 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Vatican", start: 4677854, end: 4680495 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Vienna", start: 4680495, end: 4682695 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Vilnius", start: 4682695, end: 4684857 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Volgograd", start: 4684857, end: 4686050 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Warsaw", start: 4686050, end: 4688704 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Zagreb", start: 4688704, end: 4690624 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Zaporozhye", start: 4690624, end: 4692744 }, { filename: "/tmp/pglite/share/postgresql/timezone/Europe/Zurich", start: 4692744, end: 4694653 }, { filename: "/tmp/pglite/share/postgresql/timezone/Factory", start: 4694653, end: 4694769 }, { filename: "/tmp/pglite/share/postgresql/timezone/GB", start: 4694769, end: 4698433 }, { filename: "/tmp/pglite/share/postgresql/timezone/GB-Eire", start: 4698433, end: 4702097 }, { filename: "/tmp/pglite/share/postgresql/timezone/GMT", start: 4702097, end: 4702211 }, { filename: "/tmp/pglite/share/postgresql/timezone/GMT+0", start: 4702211, end: 4702325 }, { filename: "/tmp/pglite/share/postgresql/timezone/GMT-0", start: 4702325, end: 4702439 }, { filename: "/tmp/pglite/share/postgresql/timezone/GMT0", start: 4702439, end: 4702553 }, { filename: "/tmp/pglite/share/postgresql/timezone/Greenwich", start: 4702553, end: 4702667 }, { filename: "/tmp/pglite/share/postgresql/timezone/HST", start: 4702667, end: 4702996 }, { filename: "/tmp/pglite/share/postgresql/timezone/Hongkong", start: 4702996, end: 4704229 }, { filename: "/tmp/pglite/share/postgresql/timezone/Iceland", start: 4704229, end: 4704377 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Antananarivo", start: 4704377, end: 4704642 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Chagos", start: 4704642, end: 4704841 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Christmas", start: 4704841, end: 4705040 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Cocos", start: 4705040, end: 4705308 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Comoro", start: 4705308, end: 4705573 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Kerguelen", start: 4705573, end: 4705772 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Mahe", start: 4705772, end: 4705937 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Maldives", start: 4705937, end: 4706136 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Mauritius", start: 4706136, end: 4706377 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Mayotte", start: 4706377, end: 4706642 }, { filename: "/tmp/pglite/share/postgresql/timezone/Indian/Reunion", start: 4706642, end: 4706807 }, { filename: "/tmp/pglite/share/postgresql/timezone/Iran", start: 4706807, end: 4708069 }, { filename: "/tmp/pglite/share/postgresql/timezone/Israel", start: 4708069, end: 4710457 }, { filename: "/tmp/pglite/share/postgresql/timezone/Jamaica", start: 4710457, end: 4710939 }, { filename: "/tmp/pglite/share/postgresql/timezone/Japan", start: 4710939, end: 4711248 }, { filename: "/tmp/pglite/share/postgresql/timezone/Kwajalein", start: 4711248, end: 4711564 }, { filename: "/tmp/pglite/share/postgresql/timezone/Libya", start: 4711564, end: 4712189 }, { filename: "/tmp/pglite/share/postgresql/timezone/MET", start: 4712189, end: 4715122 }, { filename: "/tmp/pglite/share/postgresql/timezone/MST", start: 4715122, end: 4715482 }, { filename: "/tmp/pglite/share/postgresql/timezone/MST7MDT", start: 4715482, end: 4717942 }, { filename: "/tmp/pglite/share/postgresql/timezone/Mexico/BajaNorte", start: 4717942, end: 4720400 }, { filename: "/tmp/pglite/share/postgresql/timezone/Mexico/BajaSur", start: 4720400, end: 4721460 }, { filename: "/tmp/pglite/share/postgresql/timezone/Mexico/General", start: 4721460, end: 4722682 }, { filename: "/tmp/pglite/share/postgresql/timezone/NZ", start: 4722682, end: 4725119 }, { filename: "/tmp/pglite/share/postgresql/timezone/NZ-CHAT", start: 4725119, end: 4727187 }, { filename: "/tmp/pglite/share/postgresql/timezone/Navajo", start: 4727187, end: 4729647 }, { filename: "/tmp/pglite/share/postgresql/timezone/PRC", start: 4729647, end: 4730208 }, { filename: "/tmp/pglite/share/postgresql/timezone/PST8PDT", start: 4730208, end: 4733060 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Apia", start: 4733060, end: 4733672 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Auckland", start: 4733672, end: 4736109 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Bougainville", start: 4736109, end: 4736377 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Chatham", start: 4736377, end: 4738445 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Chuuk", start: 4738445, end: 4738631 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Easter", start: 4738631, end: 4740864 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Efate", start: 4740864, end: 4741402 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Enderbury", start: 4741402, end: 4741636 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Fakaofo", start: 4741636, end: 4741836 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Fiji", start: 4741836, end: 4742414 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Funafuti", start: 4742414, end: 4742580 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Galapagos", start: 4742580, end: 4742818 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Gambier", start: 4742818, end: 4742982 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Guadalcanal", start: 4742982, end: 4743148 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Guam", start: 4743148, end: 4743642 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Honolulu", start: 4743642, end: 4743971 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Johnston", start: 4743971, end: 4744300 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Kanton", start: 4744300, end: 4744534 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Kiritimati", start: 4744534, end: 4744772 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Kosrae", start: 4744772, end: 4745123 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Kwajalein", start: 4745123, end: 4745439 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Majuro", start: 4745439, end: 4745605 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Marquesas", start: 4745605, end: 4745778 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Midway", start: 4745778, end: 4745953 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Nauru", start: 4745953, end: 4746205 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Niue", start: 4746205, end: 4746408 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Norfolk", start: 4746408, end: 4747288 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Noumea", start: 4747288, end: 4747592 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Pago_Pago", start: 4747592, end: 4747767 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Palau", start: 4747767, end: 4747947 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Pitcairn", start: 4747947, end: 4748149 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Pohnpei", start: 4748149, end: 4748315 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Ponape", start: 4748315, end: 4748481 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Port_Moresby", start: 4748481, end: 4748667 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Rarotonga", start: 4748667, end: 4749270 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Saipan", start: 4749270, end: 4749764 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Samoa", start: 4749764, end: 4749939 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Tahiti", start: 4749939, end: 4750104 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Tarawa", start: 4750104, end: 4750270 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Tongatapu", start: 4750270, end: 4750642 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Truk", start: 4750642, end: 4750828 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Wake", start: 4750828, end: 4750994 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Wallis", start: 4750994, end: 4751160 }, { filename: "/tmp/pglite/share/postgresql/timezone/Pacific/Yap", start: 4751160, end: 4751346 }, { filename: "/tmp/pglite/share/postgresql/timezone/Poland", start: 4751346, end: 4754e3 }, { filename: "/tmp/pglite/share/postgresql/timezone/Portugal", start: 4754e3, end: 4757527 }, { filename: "/tmp/pglite/share/postgresql/timezone/ROC", start: 4757527, end: 4758288 }, { filename: "/tmp/pglite/share/postgresql/timezone/ROK", start: 4758288, end: 4758905 }, { filename: "/tmp/pglite/share/postgresql/timezone/Singapore", start: 4758905, end: 4759320 }, { filename: "/tmp/pglite/share/postgresql/timezone/Turkey", start: 4759320, end: 4761267 }, { filename: "/tmp/pglite/share/postgresql/timezone/UCT", start: 4761267, end: 4761381 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Alaska", start: 4761381, end: 4763752 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Aleutian", start: 4763752, end: 4766108 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Arizona", start: 4766108, end: 4766468 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Central", start: 4766468, end: 4770060 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/East-Indiana", start: 4770060, end: 4771742 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Eastern", start: 4771742, end: 4775294 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Hawaii", start: 4775294, end: 4775623 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Indiana-Starke", start: 4775623, end: 4778067 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Michigan", start: 4778067, end: 4780297 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Mountain", start: 4780297, end: 4782757 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Pacific", start: 4782757, end: 4785609 }, { filename: "/tmp/pglite/share/postgresql/timezone/US/Samoa", start: 4785609, end: 4785784 }, { filename: "/tmp/pglite/share/postgresql/timezone/UTC", start: 4785784, end: 4785898 }, { filename: "/tmp/pglite/share/postgresql/timezone/Universal", start: 4785898, end: 4786012 }, { filename: "/tmp/pglite/share/postgresql/timezone/W-SU", start: 4786012, end: 4787547 }, { filename: "/tmp/pglite/share/postgresql/timezone/WET", start: 4787547, end: 4791074 }, { filename: "/tmp/pglite/share/postgresql/timezone/Zulu", start: 4791074, end: 4791188 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Africa.txt", start: 4791188, end: 4798161 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/America.txt", start: 4798161, end: 4809168 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Antarctica.txt", start: 4809168, end: 4810302 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Asia.txt", start: 4810302, end: 4818613 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Atlantic.txt", start: 4818613, end: 4822146 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Australia", start: 4822146, end: 4823281 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Australia.txt", start: 4823281, end: 4826665 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Default", start: 4826665, end: 4853879 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Etc.txt", start: 4853879, end: 4855129 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Europe.txt", start: 4855129, end: 4863875 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/India", start: 4863875, end: 4864468 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Indian.txt", start: 4864468, end: 4865729 }, { filename: "/tmp/pglite/share/postgresql/timezonesets/Pacific.txt", start: 4865729, end: 4869497 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/danish.stop", start: 4869497, end: 4869921 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/dutch.stop", start: 4869921, end: 4870374 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/english.stop", start: 4870374, end: 4870996 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/finnish.stop", start: 4870996, end: 4872575 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/french.stop", start: 4872575, end: 4873380 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/german.stop", start: 4873380, end: 4874729 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hungarian.stop", start: 4874729, end: 4875956 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample.affix", start: 4875956, end: 4876199 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample_long.affix", start: 4876199, end: 4876832 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample_long.dict", start: 4876832, end: 4876930 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample_num.affix", start: 4876930, end: 4877392 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/hunspell_sample_num.dict", start: 4877392, end: 4877521 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/ispell_sample.affix", start: 4877521, end: 4877986 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/ispell_sample.dict", start: 4877986, end: 4878067 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/italian.stop", start: 4878067, end: 4879721 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/nepali.stop", start: 4879721, end: 4883982 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/norwegian.stop", start: 4883982, end: 4884833 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/portuguese.stop", start: 4884833, end: 4886100 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/russian.stop", start: 4886100, end: 4887335 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/spanish.stop", start: 4887335, end: 4889513 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/swedish.stop", start: 4889513, end: 4890072 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/synonym_sample.syn", start: 4890072, end: 4890145 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/thesaurus_sample.ths", start: 4890145, end: 4890618 }, { filename: "/tmp/pglite/share/postgresql/tsearch_data/turkish.stop", start: 4890618, end: 4890878 }], remote_package_size: 4890878 });
    })();
    var moduleOverrides = Object.assign({}, Module);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = /* @__PURE__ */ __name((status, toThrow) => {
      throw toThrow;
    }, "quit_");
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    __name(locateFile, "locateFile");
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      var fs = require("fs");
      var nodePath = require("path");
      if (!"".startsWith("data:")) {
        scriptDirectory = nodePath.dirname(require("url").fileURLToPath("")) + "/";
      }
      readBinary = /* @__PURE__ */ __name((filename) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename);
        return ret;
      }, "readBinary");
      readAsync = /* @__PURE__ */ __name(async (filename, binary2 = true) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename, binary2 ? void 0 : "utf8");
        return ret;
      }, "readAsync");
      if (!Module["thisProgram"] && process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, "/");
      }
      arguments_ = process.argv.slice(2);
      quit_ = /* @__PURE__ */ __name((status, toThrow) => {
        process.exitCode = status;
        throw toThrow;
      }, "quit_");
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location?.href || "";
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptName) {
        scriptDirectory = _scriptName;
      }
      if (scriptDirectory.startsWith("blob:")) {
        scriptDirectory = "";
      } else {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      }
      {
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = /* @__PURE__ */ __name((url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
          }, "readBinary");
        }
        readAsync = /* @__PURE__ */ __name(async (url) => {
          var response = await fetch(url, { credentials: "same-origin" });
          if (response.ok) {
            return response.arrayBuffer();
          }
          throw new Error(response.status + " : " + response.url);
        }, "readAsync");
      }
    } else {
    }
    var out = Module["print"] || console.log.bind(console);
    var err = Module["printErr"] || console.error.bind(console);
    Object.assign(Module, moduleOverrides);
    moduleOverrides = null;
    if (Module["arguments"])
      arguments_ = Module["arguments"];
    if (Module["thisProgram"])
      thisProgram = Module["thisProgram"];
    var dynamicLibraries = Module["dynamicLibraries"] || [];
    var wasmBinary = Module["wasmBinary"];
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function assert(condition, text) {
      if (!condition) {
        abort(text);
      }
    }
    __name(assert, "assert");
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAP64, HEAPU64, HEAPF64;
    function updateMemoryViews() {
      var b3 = wasmMemory.buffer;
      Module["HEAP8"] = HEAP8 = new Int8Array(b3);
      Module["HEAP16"] = HEAP16 = new Int16Array(b3);
      Module["HEAPU8"] = HEAPU8 = new Uint8Array(b3);
      Module["HEAPU16"] = HEAPU16 = new Uint16Array(b3);
      Module["HEAP32"] = HEAP32 = new Int32Array(b3);
      Module["HEAPU32"] = HEAPU32 = new Uint32Array(b3);
      Module["HEAPF32"] = HEAPF32 = new Float32Array(b3);
      Module["HEAPF64"] = HEAPF64 = new Float64Array(b3);
      Module["HEAP64"] = HEAP64 = new BigInt64Array(b3);
      Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b3);
    }
    __name(updateMemoryViews, "updateMemoryViews");
    if (Module["wasmMemory"]) {
      wasmMemory = Module["wasmMemory"];
    } else {
      var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 16777216;
      wasmMemory = new WebAssembly.Memory({ initial: INITIAL_MEMORY / 65536, maximum: 32768 });
    }
    updateMemoryViews();
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATMAIN__ = [];
    var __ATPOSTRUN__ = [];
    var __RELOC_FUNCS__ = [];
    var runtimeInitialized = false;
    function preRun() {
      if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function")
          Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
          addOnPreRun(Module["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    __name(preRun, "preRun");
    function initRuntime() {
      runtimeInitialized = true;
      callRuntimeCallbacks(__RELOC_FUNCS__);
      if (!Module["noFSInit"] && !FS.initialized)
        FS.init();
      FS.ignorePermissions = false;
      TTY.init();
      SOCKFS.root = FS.mount(SOCKFS, {}, null);
      PIPEFS.root = FS.mount(PIPEFS, {}, null);
      callRuntimeCallbacks(__ATINIT__);
    }
    __name(initRuntime, "initRuntime");
    function preMain() {
      callRuntimeCallbacks(__ATMAIN__);
    }
    __name(preMain, "preMain");
    function postRun() {
      if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function")
          Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
          addOnPostRun(Module["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    __name(postRun, "postRun");
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    __name(addOnPreRun, "addOnPreRun");
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    __name(addOnInit, "addOnInit");
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    __name(addOnPostRun, "addOnPostRun");
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    function getUniqueRunDependency(id) {
      return id;
    }
    __name(getUniqueRunDependency, "getUniqueRunDependency");
    function addRunDependency(id) {
      runDependencies++;
      Module["monitorRunDependencies"]?.(runDependencies);
    }
    __name(addRunDependency, "addRunDependency");
    function removeRunDependency(id) {
      runDependencies--;
      Module["monitorRunDependencies"]?.(runDependencies);
      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    __name(removeRunDependency, "removeRunDependency");
    function abort(what) {
      Module["onAbort"]?.(what);
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    __name(abort, "abort");
    var dataURIPrefix = "data:application/octet-stream;base64,";
    var isDataURI = /* @__PURE__ */ __name((filename) => filename.startsWith(dataURIPrefix), "isDataURI");
    var isFileURI = /* @__PURE__ */ __name((filename) => filename.startsWith("file://"), "isFileURI");
    function findWasmBinary() {
      if (Module["locateFile"]) {
        var f2 = "pglite.wasm";
        if (!isDataURI(f2)) {
          return locateFile(f2);
        }
        return f2;
      }
      return "pglite.wasm";
    }
    __name(findWasmBinary, "findWasmBinary");
    var wasmBinaryFile;
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      if (readBinary) {
        return readBinary(file);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    __name(getBinarySync, "getBinarySync");
    async function getWasmBinary(binaryFile) {
      if (!wasmBinary) {
        try {
          var response = await readAsync(binaryFile);
          return new Uint8Array(response);
        } catch {
        }
      }
      return getBinarySync(binaryFile);
    }
    __name(getWasmBinary, "getWasmBinary");
    async function instantiateArrayBuffer(binaryFile, imports) {
      try {
        var binary2 = await getWasmBinary(binaryFile);
        var instance2 = await WebAssembly.instantiate(binary2, imports);
        return instance2;
      } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason);
      }
    }
    __name(instantiateArrayBuffer, "instantiateArrayBuffer");
    async function instantiateAsync(binary2, binaryFile, imports) {
      if (!binary2 && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
        try {
          var response = fetch(binaryFile, { credentials: "same-origin" });
          var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
          return instantiationResult;
        } catch (reason) {
          err(`wasm streaming compile failed: ${reason}`);
          err("falling back to ArrayBuffer instantiation");
        }
      }
      return instantiateArrayBuffer(binaryFile, imports);
    }
    __name(instantiateAsync, "instantiateAsync");
    function getWasmImports() {
      return { env: wasmImports, wasi_snapshot_preview1: wasmImports, "GOT.mem": new Proxy(wasmImports, GOTHandler), "GOT.func": new Proxy(wasmImports, GOTHandler) };
    }
    __name(getWasmImports, "getWasmImports");
    async function createWasm() {
      function receiveInstance(instance2, module2) {
        wasmExports = instance2.exports;
        wasmExports = relocateExports(wasmExports, 1024);
        var metadata2 = getDylinkMetadata(module2);
        if (metadata2.neededDynlibs) {
          dynamicLibraries = metadata2.neededDynlibs.concat(dynamicLibraries);
        }
        mergeLibSymbols(wasmExports, "main");
        LDSO.init();
        loadDylibs();
        addOnInit(wasmExports["__wasm_call_ctors"]);
        __RELOC_FUNCS__.push(wasmExports["__wasm_apply_data_relocs"]);
        removeRunDependency("wasm-instantiate");
        return wasmExports;
      }
      __name(receiveInstance, "receiveInstance");
      addRunDependency("wasm-instantiate");
      function receiveInstantiationResult(result2) {
        receiveInstance(result2["instance"], result2["module"]);
      }
      __name(receiveInstantiationResult, "receiveInstantiationResult");
      var info4 = getWasmImports();
      if (Module["instantiateWasm"]) {
        try {
          return Module["instantiateWasm"](info4, receiveInstance);
        } catch (e) {
          err(`Module.instantiateWasm callback failed with error: ${e}`);
          readyPromiseReject(e);
        }
      }
      wasmBinaryFile ??= findWasmBinary();
      try {
        var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info4);
        receiveInstantiationResult(result);
        return result;
      } catch (e) {
        readyPromiseReject(e);
        return;
      }
    }
    __name(createWasm, "createWasm");
    var ASM_CONSTS = { 2529720: ($0) => {
      Module.is_worker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
      Module.FD_BUFFER_MAX = $0;
      Module.emscripten_copy_to = console.warn;
    }, 2529892: () => {
      Module["postMessage"] = /* @__PURE__ */ __name(function custom_postMessage(event) {
        console.log("# pg_main_emsdk.c:544: onCustomMessage:", event);
      }, "custom_postMessage");
    }, 2530021: () => {
      if (Module.is_worker) {
        let onCustomMessage2 = function(event) {
          console.log("onCustomMessage:", event);
        };
        var onCustomMessage = onCustomMessage2;
        __name(onCustomMessage2, "onCustomMessage");
        Module["onCustomMessage"] = onCustomMessage2;
      } else {
        Module["postMessage"] = /* @__PURE__ */ __name(function custom_postMessage(event) {
          switch (event.type) {
            case "raw": {
              break;
            }
            case "stdin": {
              stringToUTF8(event.data, 1, Module.FD_BUFFER_MAX);
              break;
            }
            case "rcon": {
              break;
            }
            default:
              console.warn("custom_postMessage?", event);
          }
        }, "custom_postMessage");
      }
    } };
    function pglite_read_trampoline(buffer, max_length) {
      if (!Module._pgliteCallbacks || !Module._pgliteCallbacks.read) {
        console.error("pglite_read_trampoline: no read callback registered");
        return 0;
      }
      try {
        return Module._pgliteCallbacks.read(buffer, max_length);
      } catch (e) {
        console.error("pglite_read_trampoline error:", e);
        return -1;
      }
    }
    __name(pglite_read_trampoline, "pglite_read_trampoline");
    pglite_read_trampoline.sig = "iii";
    function pglite_write_trampoline(buffer, length) {
      if (!Module._pgliteCallbacks || !Module._pgliteCallbacks.write) {
        console.error("pglite_write_trampoline: no write callback registered");
        return -1;
      }
      try {
        return Module._pgliteCallbacks.write(buffer, length);
      } catch (e) {
        console.error("pglite_write_trampoline error:", e);
        return -1;
      }
    }
    __name(pglite_write_trampoline, "pglite_write_trampoline");
    pglite_write_trampoline.sig = "iii";
    class ExitStatus {
      name = "ExitStatus";
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }
    __name(ExitStatus, "ExitStatus");
    var GOT = {};
    var currentModuleWeakSymbols = /* @__PURE__ */ new Set([]);
    var GOTHandler = { get(obj, symName) {
      var rtn = GOT[symName];
      if (!rtn) {
        rtn = GOT[symName] = new WebAssembly.Global({ value: "i32", mutable: true });
      }
      if (!currentModuleWeakSymbols.has(symName)) {
        rtn.required = true;
      }
      return rtn;
    } };
    var callRuntimeCallbacks = /* @__PURE__ */ __name((callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module);
      }
    }, "callRuntimeCallbacks");
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
    var UTF8ArrayToString = /* @__PURE__ */ __name((heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx))
        ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }, "UTF8ArrayToString");
    var getDylinkMetadata = /* @__PURE__ */ __name((binary2) => {
      var offset = 0;
      var end = 0;
      function getU8() {
        return binary2[offset++];
      }
      __name(getU8, "getU8");
      function getLEB() {
        var ret = 0;
        var mul = 1;
        while (1) {
          var byte = binary2[offset++];
          ret += (byte & 127) * mul;
          mul *= 128;
          if (!(byte & 128))
            break;
        }
        return ret;
      }
      __name(getLEB, "getLEB");
      function getString() {
        var len = getLEB();
        offset += len;
        return UTF8ArrayToString(binary2, offset - len, len);
      }
      __name(getString, "getString");
      function failIf(condition, message) {
        if (condition)
          throw new Error(message);
      }
      __name(failIf, "failIf");
      var name2 = "dylink.0";
      if (binary2 instanceof WebAssembly.Module) {
        var dylinkSection = WebAssembly.Module.customSections(binary2, name2);
        if (dylinkSection.length === 0) {
          name2 = "dylink";
          dylinkSection = WebAssembly.Module.customSections(binary2, name2);
        }
        failIf(dylinkSection.length === 0, "need dylink section");
        binary2 = new Uint8Array(dylinkSection[0]);
        end = binary2.length;
      } else {
        var int32View = new Uint32Array(new Uint8Array(binary2.subarray(0, 24)).buffer);
        var magicNumberFound = int32View[0] == 1836278016;
        failIf(!magicNumberFound, "need to see wasm magic number");
        failIf(binary2[8] !== 0, "need the dylink section to be first");
        offset = 9;
        var section_size = getLEB();
        end = offset + section_size;
        name2 = getString();
      }
      var customSection = { neededDynlibs: [], tlsExports: /* @__PURE__ */ new Set(), weakImports: /* @__PURE__ */ new Set() };
      if (name2 == "dylink") {
        customSection.memorySize = getLEB();
        customSection.memoryAlign = getLEB();
        customSection.tableSize = getLEB();
        customSection.tableAlign = getLEB();
        var neededDynlibsCount = getLEB();
        for (var i2 = 0; i2 < neededDynlibsCount; ++i2) {
          var libname = getString();
          customSection.neededDynlibs.push(libname);
        }
      } else {
        failIf(name2 !== "dylink.0");
        var WASM_DYLINK_MEM_INFO = 1;
        var WASM_DYLINK_NEEDED = 2;
        var WASM_DYLINK_EXPORT_INFO = 3;
        var WASM_DYLINK_IMPORT_INFO = 4;
        var WASM_SYMBOL_TLS = 256;
        var WASM_SYMBOL_BINDING_MASK = 3;
        var WASM_SYMBOL_BINDING_WEAK = 1;
        while (offset < end) {
          var subsectionType = getU8();
          var subsectionSize = getLEB();
          if (subsectionType === WASM_DYLINK_MEM_INFO) {
            customSection.memorySize = getLEB();
            customSection.memoryAlign = getLEB();
            customSection.tableSize = getLEB();
            customSection.tableAlign = getLEB();
          } else if (subsectionType === WASM_DYLINK_NEEDED) {
            var neededDynlibsCount = getLEB();
            for (var i2 = 0; i2 < neededDynlibsCount; ++i2) {
              libname = getString();
              customSection.neededDynlibs.push(libname);
            }
          } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
            var count3 = getLEB();
            while (count3--) {
              var symname = getString();
              var flags2 = getLEB();
              if (flags2 & WASM_SYMBOL_TLS) {
                customSection.tlsExports.add(symname);
              }
            }
          } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
            var count3 = getLEB();
            while (count3--) {
              var modname = getString();
              var symname = getString();
              var flags2 = getLEB();
              if ((flags2 & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
                customSection.weakImports.add(symname);
              }
            }
          } else {
            offset += subsectionSize;
          }
        }
      }
      return customSection;
    }, "getDylinkMetadata");
    function getValue(ptr, type = "i8") {
      if (type.endsWith("*"))
        type = "*";
      switch (type) {
        case "i1":
          return HEAP8[ptr];
        case "i8":
          return HEAP8[ptr];
        case "i16":
          return HEAP16[ptr >> 1];
        case "i32":
          return HEAP32[ptr >> 2];
        case "i64":
          return HEAP64[ptr >> 3];
        case "float":
          return HEAPF32[ptr >> 2];
        case "double":
          return HEAPF64[ptr >> 3];
        case "*":
          return HEAPU32[ptr >> 2];
        default:
          abort(`invalid type for getValue: ${type}`);
      }
    }
    __name(getValue, "getValue");
    var newDSO = /* @__PURE__ */ __name((name2, handle2, syms) => {
      var dso = { refcount: Infinity, name: name2, exports: syms, global: true };
      LDSO.loadedLibsByName[name2] = dso;
      if (handle2 != void 0) {
        LDSO.loadedLibsByHandle[handle2] = dso;
      }
      return dso;
    }, "newDSO");
    var LDSO = { loadedLibsByName: {}, loadedLibsByHandle: {}, init() {
      newDSO("__main__", 0, wasmImports);
    } };
    var ___heap_base = 7935936;
    var alignMemory = /* @__PURE__ */ __name((size, alignment) => Math.ceil(size / alignment) * alignment, "alignMemory");
    var getMemory = /* @__PURE__ */ __name((size) => {
      if (runtimeInitialized) {
        return _calloc(size, 1);
      }
      var ret = ___heap_base;
      var end = ret + alignMemory(size, 16);
      ___heap_base = end;
      GOT["__heap_base"].value = end;
      return ret;
    }, "getMemory");
    var isInternalSym = /* @__PURE__ */ __name((symName) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(symName) || symName.startsWith("__em_js__"), "isInternalSym");
    var uleb128Encode = /* @__PURE__ */ __name((n, target) => {
      if (n < 128) {
        target.push(n);
      } else {
        target.push(n % 128 | 128, n >> 7);
      }
    }, "uleb128Encode");
    var sigToWasmTypes = /* @__PURE__ */ __name((sig) => {
      var typeNames = { i: "i32", j: "i64", f: "f32", d: "f64", e: "externref", p: "i32" };
      var type = { parameters: [], results: sig[0] == "v" ? [] : [typeNames[sig[0]]] };
      for (var i2 = 1; i2 < sig.length; ++i2) {
        type.parameters.push(typeNames[sig[i2]]);
      }
      return type;
    }, "sigToWasmTypes");
    var generateFuncType = /* @__PURE__ */ __name((sig, target) => {
      var sigRet = sig.slice(0, 1);
      var sigParam = sig.slice(1);
      var typeCodes = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 };
      target.push(96);
      uleb128Encode(sigParam.length, target);
      for (var i2 = 0; i2 < sigParam.length; ++i2) {
        target.push(typeCodes[sigParam[i2]]);
      }
      if (sigRet == "v") {
        target.push(0);
      } else {
        target.push(1, typeCodes[sigRet]);
      }
    }, "generateFuncType");
    var convertJsFunctionToWasm = /* @__PURE__ */ __name((func2, sig) => {
      if (typeof WebAssembly.Function == "function") {
        return new WebAssembly.Function(sigToWasmTypes(sig), func2);
      }
      var typeSectionBody = [1];
      generateFuncType(sig, typeSectionBody);
      var bytes = [0, 97, 115, 109, 1, 0, 0, 0, 1];
      uleb128Encode(typeSectionBody.length, bytes);
      bytes.push(...typeSectionBody);
      bytes.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
      var module2 = new WebAssembly.Module(new Uint8Array(bytes));
      var instance2 = new WebAssembly.Instance(module2, { e: { f: func2 } });
      var wrappedFunc = instance2.exports["f"];
      return wrappedFunc;
    }, "convertJsFunctionToWasm");
    var wasmTable = new WebAssembly.Table({ initial: 5628, element: "anyfunc" });
    var getWasmTableEntry = /* @__PURE__ */ __name((funcPtr) => wasmTable.get(funcPtr), "getWasmTableEntry");
    var updateTableMap = /* @__PURE__ */ __name((offset, count3) => {
      if (functionsInTableMap) {
        for (var i2 = offset; i2 < offset + count3; i2++) {
          var item = getWasmTableEntry(i2);
          if (item) {
            functionsInTableMap.set(item, i2);
          }
        }
      }
    }, "updateTableMap");
    var functionsInTableMap;
    var getFunctionAddress = /* @__PURE__ */ __name((func2) => {
      if (!functionsInTableMap) {
        functionsInTableMap = /* @__PURE__ */ new WeakMap();
        updateTableMap(0, wasmTable.length);
      }
      return functionsInTableMap.get(func2) || 0;
    }, "getFunctionAddress");
    var freeTableIndexes = [];
    var getEmptyTableSlot = /* @__PURE__ */ __name(() => {
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop();
      }
      try {
        wasmTable.grow(1);
      } catch (err2) {
        if (!(err2 instanceof RangeError)) {
          throw err2;
        }
        throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
      }
      return wasmTable.length - 1;
    }, "getEmptyTableSlot");
    var setWasmTableEntry = /* @__PURE__ */ __name((idx, func2) => wasmTable.set(idx, func2), "setWasmTableEntry");
    var addFunction = /* @__PURE__ */ __name((func2, sig) => {
      var rtn = getFunctionAddress(func2);
      if (rtn) {
        return rtn;
      }
      var ret = getEmptyTableSlot();
      try {
        setWasmTableEntry(ret, func2);
      } catch (err2) {
        if (!(err2 instanceof TypeError)) {
          throw err2;
        }
        var wrapped = convertJsFunctionToWasm(func2, sig);
        setWasmTableEntry(ret, wrapped);
      }
      functionsInTableMap.set(func2, ret);
      return ret;
    }, "addFunction");
    var updateGOT = /* @__PURE__ */ __name((exports, replace) => {
      for (var symName in exports) {
        if (isInternalSym(symName)) {
          continue;
        }
        var value = exports[symName];
        GOT[symName] ||= new WebAssembly.Global({ value: "i32", mutable: true });
        if (replace || GOT[symName].value == 0) {
          if (typeof value == "function") {
            GOT[symName].value = addFunction(value);
          } else if (typeof value == "number") {
            GOT[symName].value = value;
          } else {
            err(`unhandled export type for '${symName}': ${typeof value}`);
          }
        }
      }
    }, "updateGOT");
    var relocateExports = /* @__PURE__ */ __name((exports, memoryBase2, replace) => {
      var relocated = {};
      for (var e in exports) {
        var value = exports[e];
        if (typeof value == "object") {
          value = value.value;
        }
        if (typeof value == "number") {
          value += memoryBase2;
        }
        relocated[e] = value;
      }
      updateGOT(relocated, replace);
      return relocated;
    }, "relocateExports");
    var isSymbolDefined = /* @__PURE__ */ __name((symName) => {
      var existing = wasmImports[symName];
      if (!existing || existing.stub) {
        return false;
      }
      return true;
    }, "isSymbolDefined");
    var dynCall = /* @__PURE__ */ __name((sig, ptr, args2 = []) => {
      var rtn = getWasmTableEntry(ptr)(...args2);
      return rtn;
    }, "dynCall");
    var stackSave = /* @__PURE__ */ __name(() => _emscripten_stack_get_current(), "stackSave");
    var stackRestore = /* @__PURE__ */ __name((val) => __emscripten_stack_restore(val), "stackRestore");
    var createInvokeFunction = /* @__PURE__ */ __name((sig) => (ptr, ...args2) => {
      var sp = stackSave();
      try {
        return dynCall(sig, ptr, args2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
        if (sig[0] == "j")
          return 0n;
      }
    }, "createInvokeFunction");
    var resolveGlobalSymbol = /* @__PURE__ */ __name((symName, direct = false) => {
      var sym;
      if (isSymbolDefined(symName)) {
        sym = wasmImports[symName];
      } else if (symName.startsWith("invoke_")) {
        sym = wasmImports[symName] = createInvokeFunction(symName.split("_")[1]);
      }
      return { sym, name: symName };
    }, "resolveGlobalSymbol");
    var UTF8ToString = /* @__PURE__ */ __name((ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "", "UTF8ToString");
    var loadWebAssemblyModule = /* @__PURE__ */ __name((binary, flags, libName, localScope, handle) => {
      var metadata = getDylinkMetadata(binary);
      currentModuleWeakSymbols = metadata.weakImports;
      function loadModule() {
        var firstLoad = !handle || !HEAP8[handle + 8];
        if (firstLoad) {
          var memAlign = Math.pow(2, metadata.memoryAlign);
          var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
          var tableBase = metadata.tableSize ? wasmTable.length : 0;
          if (handle) {
            HEAP8[handle + 8] = 1;
            HEAPU32[handle + 12 >> 2] = memoryBase;
            HEAP32[handle + 16 >> 2] = metadata.memorySize;
            HEAPU32[handle + 20 >> 2] = tableBase;
            HEAP32[handle + 24 >> 2] = metadata.tableSize;
          }
        } else {
          memoryBase = HEAPU32[handle + 12 >> 2];
          tableBase = HEAPU32[handle + 20 >> 2];
        }
        var tableGrowthNeeded = tableBase + metadata.tableSize - wasmTable.length;
        if (tableGrowthNeeded > 0) {
          wasmTable.grow(tableGrowthNeeded);
        }
        var moduleExports;
        function resolveSymbol(sym) {
          var resolved = resolveGlobalSymbol(sym).sym;
          if (!resolved && localScope) {
            resolved = localScope[sym];
          }
          if (!resolved) {
            resolved = moduleExports[sym];
          }
          return resolved;
        }
        __name(resolveSymbol, "resolveSymbol");
        var proxyHandler = { get(stubs, prop) {
          switch (prop) {
            case "__memory_base":
              return memoryBase;
            case "__table_base":
              return tableBase;
          }
          if (prop in wasmImports && !wasmImports[prop].stub) {
            return wasmImports[prop];
          }
          if (!(prop in stubs)) {
            var resolved;
            stubs[prop] = (...args2) => {
              resolved ||= resolveSymbol(prop);
              return resolved(...args2);
            };
          }
          return stubs[prop];
        } };
        var proxy = new Proxy({}, proxyHandler);
        var info = { "GOT.mem": new Proxy({}, GOTHandler), "GOT.func": new Proxy({}, GOTHandler), env: proxy, wasi_snapshot_preview1: proxy };
        function postInstantiation(module, instance) {
          updateTableMap(tableBase, metadata.tableSize);
          moduleExports = relocateExports(instance.exports, memoryBase);
          if (!flags.allowUndefined) {
            reportUndefinedSymbols();
          }
          function addEmAsm(addr, body) {
            var args = [];
            var arity = 0;
            for (; arity < 16; arity++) {
              if (body.indexOf("$" + arity) != -1) {
                args.push("$" + arity);
              } else {
                break;
              }
            }
            args = args.join(",");
            var func = `(${args}) => { ${body} };`;
            ASM_CONSTS[start] = eval(func);
          }
          __name(addEmAsm, "addEmAsm");
          if ("__start_em_asm" in moduleExports) {
            var start = moduleExports["__start_em_asm"];
            var stop = moduleExports["__stop_em_asm"];
            while (start < stop) {
              var jsString = UTF8ToString(start);
              addEmAsm(start, jsString);
              start = HEAPU8.indexOf(0, start) + 1;
            }
          }
          function addEmJs(name, cSig, body) {
            var jsArgs = [];
            cSig = cSig.slice(1, -1);
            if (cSig != "void") {
              cSig = cSig.split(",");
              for (var i in cSig) {
                var jsArg = cSig[i].split(" ").pop();
                jsArgs.push(jsArg.replace("*", ""));
              }
            }
            var func = `(${jsArgs}) => ${body};`;
            moduleExports[name] = eval(func);
          }
          __name(addEmJs, "addEmJs");
          for (var name in moduleExports) {
            if (name.startsWith("__em_js__")) {
              var start = moduleExports[name];
              var jsString = UTF8ToString(start);
              var parts = jsString.split("<::>");
              addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]);
              delete moduleExports[name];
            }
          }
          var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
          if (applyRelocs) {
            if (runtimeInitialized) {
              applyRelocs();
            } else {
              __RELOC_FUNCS__.push(applyRelocs);
            }
          }
          var init = moduleExports["__wasm_call_ctors"];
          if (init) {
            if (runtimeInitialized) {
              init();
            } else {
              __ATINIT__.push(init);
            }
          }
          return moduleExports;
        }
        __name(postInstantiation, "postInstantiation");
        if (flags.loadAsync) {
          if (binary instanceof WebAssembly.Module) {
            var instance = new WebAssembly.Instance(binary, info);
            return Promise.resolve(postInstantiation(binary, instance));
          }
          return WebAssembly.instantiate(binary, info).then((result) => postInstantiation(result.module, result.instance));
        }
        var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
        var instance = new WebAssembly.Instance(module, info);
        return postInstantiation(module, instance);
      }
      __name(loadModule, "loadModule");
      if (flags.loadAsync) {
        return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
      }
      metadata.neededDynlibs.forEach((needed) => loadDynamicLibrary(needed, flags, localScope));
      return loadModule();
    }, "loadWebAssemblyModule");
    var mergeLibSymbols = /* @__PURE__ */ __name((exports, libName2) => {
      for (var [sym, exp] of Object.entries(exports)) {
        const setImport = /* @__PURE__ */ __name((target) => {
          if (!isSymbolDefined(target)) {
            wasmImports[target] = exp;
          }
        }, "setImport");
        setImport(sym);
        const main_alias = "__main_argc_argv";
        if (sym == "main") {
          setImport(main_alias);
        }
        if (sym == main_alias) {
          setImport("main");
        }
      }
    }, "mergeLibSymbols");
    var asyncLoad = /* @__PURE__ */ __name(async (url) => {
      var arrayBuffer = await readAsync(url);
      return new Uint8Array(arrayBuffer);
    }, "asyncLoad");
    var preloadPlugins = Module["preloadPlugins"] || [];
    var registerWasmPlugin = /* @__PURE__ */ __name(() => {
      var wasmPlugin = { promiseChainEnd: Promise.resolve(), canHandle: (name2) => !Module["noWasmDecoding"] && name2.endsWith(".so"), handle: (byteArray, name2, onload, onerror) => {
        wasmPlugin["promiseChainEnd"] = wasmPlugin["promiseChainEnd"].then(() => loadWebAssemblyModule(byteArray, { loadAsync: true, nodelete: true }, name2, {})).then((exports) => {
          preloadedWasm[name2] = exports;
          onload(byteArray);
        }, (error3) => {
          err(`failed to instantiate wasm: ${name2}: ${error3}`);
          onerror();
        });
      } };
      preloadPlugins.push(wasmPlugin);
    }, "registerWasmPlugin");
    var preloadedWasm = {};
    function loadDynamicLibrary(libName2, flags2 = { global: true, nodelete: true }, localScope2, handle2) {
      var dso = LDSO.loadedLibsByName[libName2];
      if (dso) {
        if (!flags2.global) {
          if (localScope2) {
            Object.assign(localScope2, dso.exports);
          }
        } else if (!dso.global) {
          dso.global = true;
          mergeLibSymbols(dso.exports, libName2);
        }
        if (flags2.nodelete && dso.refcount !== Infinity) {
          dso.refcount = Infinity;
        }
        dso.refcount++;
        if (handle2) {
          LDSO.loadedLibsByHandle[handle2] = dso;
        }
        return flags2.loadAsync ? Promise.resolve(true) : true;
      }
      dso = newDSO(libName2, handle2, "loading");
      dso.refcount = flags2.nodelete ? Infinity : 1;
      dso.global = flags2.global;
      function loadLibData() {
        if (handle2) {
          var data = HEAPU32[handle2 + 28 >> 2];
          var dataSize = HEAPU32[handle2 + 32 >> 2];
          if (data && dataSize) {
            var libData = HEAP8.slice(data, data + dataSize);
            return flags2.loadAsync ? Promise.resolve(libData) : libData;
          }
        }
        var libFile = locateFile(libName2);
        if (flags2.loadAsync) {
          return asyncLoad(libFile);
        }
        if (!readBinary) {
          throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
        }
        return readBinary(libFile);
      }
      __name(loadLibData, "loadLibData");
      function getExports() {
        var preloaded = preloadedWasm[libName2];
        if (preloaded) {
          return flags2.loadAsync ? Promise.resolve(preloaded) : preloaded;
        }
        if (flags2.loadAsync) {
          return loadLibData().then((libData) => loadWebAssemblyModule(libData, flags2, libName2, localScope2, handle2));
        }
        return loadWebAssemblyModule(loadLibData(), flags2, libName2, localScope2, handle2);
      }
      __name(getExports, "getExports");
      function moduleLoaded(exports) {
        if (dso.global) {
          mergeLibSymbols(exports, libName2);
        } else if (localScope2) {
          Object.assign(localScope2, exports);
        }
        dso.exports = exports;
      }
      __name(moduleLoaded, "moduleLoaded");
      if (flags2.loadAsync) {
        return getExports().then((exports) => {
          moduleLoaded(exports);
          return true;
        });
      }
      moduleLoaded(getExports());
      return true;
    }
    __name(loadDynamicLibrary, "loadDynamicLibrary");
    var reportUndefinedSymbols = /* @__PURE__ */ __name(() => {
      for (var [symName, entry] of Object.entries(GOT)) {
        if (entry.value == 0) {
          var value = resolveGlobalSymbol(symName, true).sym;
          if (!value && !entry.required) {
            continue;
          }
          if (typeof value == "function") {
            entry.value = addFunction(value, value.sig);
          } else if (typeof value == "number") {
            entry.value = value;
          } else {
            throw new Error(`bad export type for '${symName}': ${typeof value}`);
          }
        }
      }
    }, "reportUndefinedSymbols");
    var loadDylibs = /* @__PURE__ */ __name(() => {
      if (!dynamicLibraries.length) {
        reportUndefinedSymbols();
        return;
      }
      addRunDependency("loadDylibs");
      dynamicLibraries.reduce((chain, lib) => chain.then(() => loadDynamicLibrary(lib, { loadAsync: true, global: true, nodelete: true, allowUndefined: true })), Promise.resolve()).then(() => {
        reportUndefinedSymbols();
        removeRunDependency("loadDylibs");
      });
    }, "loadDylibs");
    var noExitRuntime = Module["noExitRuntime"] || true;
    function setValue(ptr, value, type = "i8") {
      if (type.endsWith("*"))
        type = "*";
      switch (type) {
        case "i1":
          HEAP8[ptr] = value;
          break;
        case "i8":
          HEAP8[ptr] = value;
          break;
        case "i16":
          HEAP16[ptr >> 1] = value;
          break;
        case "i32":
          HEAP32[ptr >> 2] = value;
          break;
        case "i64":
          HEAP64[ptr >> 3] = BigInt(value);
          break;
        case "float":
          HEAPF32[ptr >> 2] = value;
          break;
        case "double":
          HEAPF64[ptr >> 3] = value;
          break;
        case "*":
          HEAPU32[ptr >> 2] = value;
          break;
        default:
          abort(`invalid type for setValue: ${type}`);
      }
    }
    __name(setValue, "setValue");
    var ___assert_fail = /* @__PURE__ */ __name((condition, filename, line, func2) => abort(`Assertion failed: ${UTF8ToString(condition)}, at: ` + [filename ? UTF8ToString(filename) : "unknown filename", line, func2 ? UTF8ToString(func2) : "unknown function"]), "___assert_fail");
    ___assert_fail.sig = "vppip";
    var ___call_sighandler = /* @__PURE__ */ __name((fp, sig) => getWasmTableEntry(fp)(sig), "___call_sighandler");
    ___call_sighandler.sig = "vpi";
    var ___memory_base = new WebAssembly.Global({ value: "i32", mutable: false }, 1024);
    Module["___memory_base"] = ___memory_base;
    var ___stack_pointer = new WebAssembly.Global({ value: "i32", mutable: true }, 7935936);
    Module["___stack_pointer"] = ___stack_pointer;
    var PATH = { isAbs: (path) => path.charAt(0) === "/", splitPath: (filename) => {
      var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
      return splitPathRe.exec(filename).slice(1);
    }, normalizeArray: (parts2, allowAboveRoot) => {
      var up = 0;
      for (var i2 = parts2.length - 1; i2 >= 0; i2--) {
        var last = parts2[i2];
        if (last === ".") {
          parts2.splice(i2, 1);
        } else if (last === "..") {
          parts2.splice(i2, 1);
          up++;
        } else if (up) {
          parts2.splice(i2, 1);
          up--;
        }
      }
      if (allowAboveRoot) {
        for (; up; up--) {
          parts2.unshift("..");
        }
      }
      return parts2;
    }, normalize: (path) => {
      var isAbsolute = PATH.isAbs(path), trailingSlash = path.substr(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((p3) => !!p3), !isAbsolute).join("/");
      if (!path && !isAbsolute) {
        path = ".";
      }
      if (path && trailingSlash) {
        path += "/";
      }
      return (isAbsolute ? "/" : "") + path;
    }, dirname: (path) => {
      var result = PATH.splitPath(path), root = result[0], dir3 = result[1];
      if (!root && !dir3) {
        return ".";
      }
      if (dir3) {
        dir3 = dir3.substr(0, dir3.length - 1);
      }
      return root + dir3;
    }, basename: (path) => {
      if (path === "/")
        return "/";
      path = PATH.normalize(path);
      path = path.replace(/\/$/, "");
      var lastSlash = path.lastIndexOf("/");
      if (lastSlash === -1)
        return path;
      return path.substr(lastSlash + 1);
    }, join: (...paths) => PATH.normalize(paths.join("/")), join2: (l3, r) => PATH.normalize(l3 + "/" + r) };
    var initRandomFill = /* @__PURE__ */ __name(() => {
      if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
        return (view) => crypto.getRandomValues(view);
      } else if (ENVIRONMENT_IS_NODE) {
        try {
          var crypto_module = require("crypto");
          var randomFillSync = crypto_module["randomFillSync"];
          if (randomFillSync) {
            return (view) => crypto_module["randomFillSync"](view);
          }
          var randomBytes = crypto_module["randomBytes"];
          return (view) => (view.set(randomBytes(view.byteLength)), view);
        } catch (e) {
        }
      }
      abort("initRandomDevice");
    }, "initRandomFill");
    var randomFill = /* @__PURE__ */ __name((view) => (randomFill = initRandomFill())(view), "randomFill");
    var PATH_FS = { resolve: (...args2) => {
      var resolvedPath = "", resolvedAbsolute = false;
      for (var i2 = args2.length - 1; i2 >= -1 && !resolvedAbsolute; i2--) {
        var path = i2 >= 0 ? args2[i2] : FS.cwd();
        if (typeof path != "string") {
          throw new TypeError("Arguments to path.resolve must be strings");
        } else if (!path) {
          return "";
        }
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p3) => !!p3), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
    }, relative: (from, to) => {
      from = PATH_FS.resolve(from).substr(1);
      to = PATH_FS.resolve(to).substr(1);
      function trim(arr) {
        var start2 = 0;
        for (; start2 < arr.length; start2++) {
          if (arr[start2] !== "")
            break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== "")
            break;
        }
        if (start2 > end)
          return [];
        return arr.slice(start2, end - start2 + 1);
      }
      __name(trim, "trim");
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i2 = 0; i2 < length; i2++) {
        if (fromParts[i2] !== toParts[i2]) {
          samePartsLength = i2;
          break;
        }
      }
      var outputParts = [];
      for (var i2 = samePartsLength; i2 < fromParts.length; i2++) {
        outputParts.push("..");
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/");
    } };
    var FS_stdin_getChar_buffer = [];
    var lengthBytesUTF8 = /* @__PURE__ */ __name((str) => {
      var len = 0;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var c3 = str.charCodeAt(i2);
        if (c3 <= 127) {
          len++;
        } else if (c3 <= 2047) {
          len += 2;
        } else if (c3 >= 55296 && c3 <= 57343) {
          len += 4;
          ++i2;
        } else {
          len += 3;
        }
      }
      return len;
    }, "lengthBytesUTF8");
    var stringToUTF8Array = /* @__PURE__ */ __name((str, heap, outIdx, maxBytesToWrite) => {
      if (!(maxBytesToWrite > 0))
        return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var u2 = str.charCodeAt(i2);
        if (u2 >= 55296 && u2 <= 57343) {
          var u1 = str.charCodeAt(++i2);
          u2 = 65536 + ((u2 & 1023) << 10) | u1 & 1023;
        }
        if (u2 <= 127) {
          if (outIdx >= endIdx)
            break;
          heap[outIdx++] = u2;
        } else if (u2 <= 2047) {
          if (outIdx + 1 >= endIdx)
            break;
          heap[outIdx++] = 192 | u2 >> 6;
          heap[outIdx++] = 128 | u2 & 63;
        } else if (u2 <= 65535) {
          if (outIdx + 2 >= endIdx)
            break;
          heap[outIdx++] = 224 | u2 >> 12;
          heap[outIdx++] = 128 | u2 >> 6 & 63;
          heap[outIdx++] = 128 | u2 & 63;
        } else {
          if (outIdx + 3 >= endIdx)
            break;
          heap[outIdx++] = 240 | u2 >> 18;
          heap[outIdx++] = 128 | u2 >> 12 & 63;
          heap[outIdx++] = 128 | u2 >> 6 & 63;
          heap[outIdx++] = 128 | u2 & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }, "stringToUTF8Array");
    function intArrayFromString(stringy, dontAddNull, length) {
      var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull)
        u8array.length = numBytesWritten;
      return u8array;
    }
    __name(intArrayFromString, "intArrayFromString");
    var FS_stdin_getChar = /* @__PURE__ */ __name(() => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
          var fd = process.stdin.fd;
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch (e) {
            if (e.toString().includes("EOF"))
              bytesRead = 0;
            else
              throw e;
          }
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString("utf-8");
          }
        } else if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) {
            result += "\n";
          }
        } else {
        }
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    }, "FS_stdin_getChar");
    var TTY = { ttys: [], init() {
    }, shutdown() {
    }, register(dev, ops) {
      TTY.ttys[dev] = { input: [], output: [], ops };
      FS.registerDevice(dev, TTY.stream_ops);
    }, stream_ops: { open(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43);
      }
      stream.tty = tty;
      stream.seekable = false;
    }, close(stream) {
      stream.tty.ops.fsync(stream.tty);
    }, fsync(stream) {
      stream.tty.ops.fsync(stream.tty);
    }, read(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60);
      }
      var bytesRead = 0;
      for (var i2 = 0; i2 < length; i2++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === void 0 && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === void 0)
          break;
        bytesRead++;
        buffer[offset + i2] = result;
      }
      if (bytesRead) {
        stream.node.atime = Date.now();
      }
      return bytesRead;
    }, write(stream, buffer, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60);
      }
      try {
        for (var i2 = 0; i2 < length; i2++) {
          stream.tty.ops.put_char(stream.tty, buffer[offset + i2]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.mtime = stream.node.ctime = Date.now();
      }
      return i2;
    } }, default_tty_ops: { get_char(tty) {
      return FS_stdin_getChar();
    }, put_char(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0)
          tty.output.push(val);
      }
    }, fsync(tty) {
      if (tty.output && tty.output.length > 0) {
        out(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    }, ioctl_tcgets(tty) {
      return { c_iflag: 25856, c_oflag: 5, c_cflag: 191, c_lflag: 35387, c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    }, ioctl_tcsets(tty, optional_actions, data) {
      return 0;
    }, ioctl_tiocgwinsz(tty) {
      return [24, 80];
    } }, default_tty1_ops: { put_char(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      } else {
        if (val != 0)
          tty.output.push(val);
      }
    }, fsync(tty) {
      if (tty.output && tty.output.length > 0) {
        err(UTF8ArrayToString(tty.output));
        tty.output = [];
      }
    } } };
    var zeroMemory = /* @__PURE__ */ __name((address, size) => {
      HEAPU8.fill(0, address, address + size);
    }, "zeroMemory");
    var mmapAlloc = /* @__PURE__ */ __name((size) => {
      size = alignMemory(size, 65536);
      var ptr = _emscripten_builtin_memalign(65536, size);
      if (ptr)
        zeroMemory(ptr, size);
      return ptr;
    }, "mmapAlloc");
    var MEMFS = { ops_table: null, mount(mount) {
      return MEMFS.createNode(null, "/", 16895, 0);
    }, createNode(parent, name2, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
        throw new FS.ErrnoError(63);
      }
      MEMFS.ops_table ||= { dir: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, lookup: MEMFS.node_ops.lookup, mknod: MEMFS.node_ops.mknod, rename: MEMFS.node_ops.rename, unlink: MEMFS.node_ops.unlink, rmdir: MEMFS.node_ops.rmdir, readdir: MEMFS.node_ops.readdir, symlink: MEMFS.node_ops.symlink }, stream: { llseek: MEMFS.stream_ops.llseek } }, file: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: { llseek: MEMFS.stream_ops.llseek, read: MEMFS.stream_ops.read, write: MEMFS.stream_ops.write, allocate: MEMFS.stream_ops.allocate, mmap: MEMFS.stream_ops.mmap, msync: MEMFS.stream_ops.msync } }, link: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, readlink: MEMFS.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: FS.chrdev_stream_ops } };
      var node = FS.createNode(parent, name2, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {};
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = null;
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream;
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream;
      }
      node.atime = node.mtime = node.ctime = Date.now();
      if (parent) {
        parent.contents[name2] = node;
        parent.atime = parent.mtime = parent.ctime = node.atime;
      }
      return node;
    }, getFileDataAsTypedArray(node) {
      if (!node.contents)
        return new Uint8Array(0);
      if (node.contents.subarray)
        return node.contents.subarray(0, node.usedBytes);
      return new Uint8Array(node.contents);
    }, expandFileStorage(node, newCapacity) {
      var prevCapacity = node.contents ? node.contents.length : 0;
      if (prevCapacity >= newCapacity)
        return;
      var CAPACITY_DOUBLING_MAX = 1024 * 1024;
      newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
      if (prevCapacity != 0)
        newCapacity = Math.max(newCapacity, 256);
      var oldContents = node.contents;
      node.contents = new Uint8Array(newCapacity);
      if (node.usedBytes > 0)
        node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
    }, resizeFileStorage(node, newSize) {
      if (node.usedBytes == newSize)
        return;
      if (newSize == 0) {
        node.contents = null;
        node.usedBytes = 0;
      } else {
        var oldContents = node.contents;
        node.contents = new Uint8Array(newSize);
        if (oldContents) {
          node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
        }
        node.usedBytes = newSize;
      }
    }, node_ops: { getattr(node) {
      var attr = {};
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.atime);
      attr.mtime = new Date(node.mtime);
      attr.ctime = new Date(node.ctime);
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    }, setattr(node, attr) {
      for (const key of ["mode", "atime", "mtime", "ctime"]) {
        if (attr[key]) {
          node[key] = attr[key];
        }
      }
      if (attr.size !== void 0) {
        MEMFS.resizeFileStorage(node, attr.size);
      }
    }, lookup(parent, name2) {
      throw MEMFS.doesNotExistError;
    }, mknod(parent, name2, mode, dev) {
      return MEMFS.createNode(parent, name2, mode, dev);
    }, rename(old_node, new_dir, new_name) {
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (new_node) {
        if (FS.isDir(old_node.mode)) {
          for (var i2 in new_node.contents) {
            throw new FS.ErrnoError(55);
          }
        }
        FS.hashRemoveNode(new_node);
      }
      delete old_node.parent.contents[old_node.name];
      new_dir.contents[new_name] = old_node;
      old_node.name = new_name;
      new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
    }, unlink(parent, name2) {
      delete parent.contents[name2];
      parent.ctime = parent.mtime = Date.now();
    }, rmdir(parent, name2) {
      var node = FS.lookupNode(parent, name2);
      for (var i2 in node.contents) {
        throw new FS.ErrnoError(55);
      }
      delete parent.contents[name2];
      parent.ctime = parent.mtime = Date.now();
    }, readdir(node) {
      return [".", "..", ...Object.keys(node.contents)];
    }, symlink(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node;
    }, readlink(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      return node.link;
    } }, stream_ops: { read(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes)
        return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      if (size > 8 && contents.subarray) {
        buffer.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i2 = 0; i2 < size; i2++)
          buffer[offset + i2] = contents[position + i2];
      }
      return size;
    }, write(stream, buffer, offset, length, position, canOwn) {
      if (buffer.buffer === HEAP8.buffer) {
        canOwn = false;
      }
      if (!length)
        return 0;
      var node = stream.node;
      node.mtime = node.ctime = Date.now();
      if (buffer.subarray && (!node.contents || node.contents.subarray)) {
        if (canOwn) {
          node.contents = buffer.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = buffer.slice(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) {
          node.contents.set(buffer.subarray(offset, offset + length), position);
          return length;
        }
      }
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer.subarray) {
        node.contents.set(buffer.subarray(offset, offset + length), position);
      } else {
        for (var i2 = 0; i2 < length; i2++) {
          node.contents[position + i2] = buffer[offset + i2];
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length;
    }, llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    }, allocate(stream, offset, length) {
      MEMFS.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
    }, mmap(stream, length, position, prot, flags2) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      if (!(flags2 & 2) && contents && contents.buffer === HEAP8.buffer) {
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        allocated = true;
        ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        if (contents) {
          if (position > 0 || position + length < contents.length) {
            if (contents.subarray) {
              contents = contents.subarray(position, position + length);
            } else {
              contents = Array.prototype.slice.call(contents, position, position + length);
            }
          }
          HEAP8.set(contents, ptr);
        }
      }
      return { ptr, allocated };
    }, msync(stream, buffer, offset, length, mmapFlags) {
      MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      return 0;
    } } };
    var FS_createDataFile = /* @__PURE__ */ __name((parent, name2, fileData, canRead, canWrite, canOwn) => {
      FS.createDataFile(parent, name2, fileData, canRead, canWrite, canOwn);
    }, "FS_createDataFile");
    var FS_handledByPreloadPlugin = /* @__PURE__ */ __name((byteArray, fullname, finish, onerror) => {
      if (typeof Browser != "undefined")
        Browser.init();
      var handled = false;
      preloadPlugins.forEach((plugin) => {
        if (handled)
          return;
        if (plugin["canHandle"](fullname)) {
          plugin["handle"](byteArray, fullname, finish, onerror);
          handled = true;
        }
      });
      return handled;
    }, "FS_handledByPreloadPlugin");
    var FS_createPreloadedFile = /* @__PURE__ */ __name((parent, name2, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      var fullname = name2 ? PATH_FS.resolve(PATH.join2(parent, name2)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`);
      function processData(byteArray) {
        function finish(byteArray2) {
          preFinish?.();
          if (!dontCreateFile) {
            FS_createDataFile(parent, name2, byteArray2, canRead, canWrite, canOwn);
          }
          onload?.();
          removeRunDependency(dep);
        }
        __name(finish, "finish");
        if (FS_handledByPreloadPlugin(byteArray, fullname, finish, () => {
          onerror?.();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      __name(processData, "processData");
      addRunDependency(dep);
      if (typeof url == "string") {
        asyncLoad(url).then(processData, onerror);
      } else {
        processData(url);
      }
    }, "FS_createPreloadedFile");
    var FS_modeStringToFlags = /* @__PURE__ */ __name((str) => {
      var flagModes = { r: 0, "r+": 2, w: 512 | 64 | 1, "w+": 512 | 64 | 2, a: 1024 | 64 | 1, "a+": 1024 | 64 | 2 };
      var flags2 = flagModes[str];
      if (typeof flags2 == "undefined") {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags2;
    }, "FS_modeStringToFlags");
    var FS_getMode = /* @__PURE__ */ __name((canRead, canWrite) => {
      var mode = 0;
      if (canRead)
        mode |= 292 | 73;
      if (canWrite)
        mode |= 146;
      return mode;
    }, "FS_getMode");
    var IDBFS = { dbs: {}, indexedDB: () => {
      if (typeof indexedDB != "undefined")
        return indexedDB;
      var ret = null;
      if (typeof window == "object")
        ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      return ret;
    }, DB_VERSION: 21, DB_STORE_NAME: "FILE_DATA", queuePersist: (mount) => {
      function onPersistComplete() {
        if (mount.idbPersistState === "again")
          startPersist();
        else
          mount.idbPersistState = 0;
      }
      __name(onPersistComplete, "onPersistComplete");
      function startPersist() {
        mount.idbPersistState = "idb";
        IDBFS.syncfs(mount, false, onPersistComplete);
      }
      __name(startPersist, "startPersist");
      if (!mount.idbPersistState) {
        mount.idbPersistState = setTimeout(startPersist, 0);
      } else if (mount.idbPersistState === "idb") {
        mount.idbPersistState = "again";
      }
    }, mount: (mount) => {
      var mnt = MEMFS.mount(mount);
      if (mount?.opts?.autoPersist) {
        mnt.idbPersistState = 0;
        var memfs_node_ops = mnt.node_ops;
        mnt.node_ops = Object.assign({}, mnt.node_ops);
        mnt.node_ops.mknod = (parent, name2, mode, dev) => {
          var node = memfs_node_ops.mknod(parent, name2, mode, dev);
          node.node_ops = mnt.node_ops;
          node.idbfs_mount = mnt.mount;
          node.memfs_stream_ops = node.stream_ops;
          node.stream_ops = Object.assign({}, node.stream_ops);
          node.stream_ops.write = (stream, buffer, offset, length, position, canOwn) => {
            stream.node.isModified = true;
            return node.memfs_stream_ops.write(stream, buffer, offset, length, position, canOwn);
          };
          node.stream_ops.close = (stream) => {
            var n = stream.node;
            if (n.isModified) {
              IDBFS.queuePersist(n.idbfs_mount);
              n.isModified = false;
            }
            if (n.memfs_stream_ops.close)
              return n.memfs_stream_ops.close(stream);
          };
          return node;
        };
        mnt.node_ops.mkdir = (...args2) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.mkdir(...args2));
        mnt.node_ops.rmdir = (...args2) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.rmdir(...args2));
        mnt.node_ops.symlink = (...args2) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.symlink(...args2));
        mnt.node_ops.unlink = (...args2) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.unlink(...args2));
        mnt.node_ops.rename = (...args2) => (IDBFS.queuePersist(mnt.mount), memfs_node_ops.rename(...args2));
      }
      return mnt;
    }, syncfs: (mount, populate, callback) => {
      IDBFS.getLocalSet(mount, (err2, local) => {
        if (err2)
          return callback(err2);
        IDBFS.getRemoteSet(mount, (err3, remote) => {
          if (err3)
            return callback(err3);
          var src = populate ? remote : local;
          var dst = populate ? local : remote;
          IDBFS.reconcile(src, dst, callback);
        });
      });
    }, quit: () => {
      Object.values(IDBFS.dbs).forEach((value) => value.close());
      IDBFS.dbs = {};
    }, getDB: (name2, callback) => {
      var db = IDBFS.dbs[name2];
      if (db) {
        return callback(null, db);
      }
      var req;
      try {
        req = IDBFS.indexedDB().open(name2, IDBFS.DB_VERSION);
      } catch (e) {
        return callback(e);
      }
      if (!req) {
        return callback("Unable to connect to IndexedDB");
      }
      req.onupgradeneeded = (e) => {
        var db2 = e.target.result;
        var transaction = e.target.transaction;
        var fileStore;
        if (db2.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
          fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
        } else {
          fileStore = db2.createObjectStore(IDBFS.DB_STORE_NAME);
        }
        if (!fileStore.indexNames.contains("timestamp")) {
          fileStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
      req.onsuccess = () => {
        db = req.result;
        IDBFS.dbs[name2] = db;
        callback(null, db);
      };
      req.onerror = (e) => {
        callback(e.target.error);
        e.preventDefault();
      };
    }, getLocalSet: (mount, callback) => {
      var entries = {};
      function isRealDir(p3) {
        return p3 !== "." && p3 !== "..";
      }
      __name(isRealDir, "isRealDir");
      function toAbsolute(root) {
        return (p3) => PATH.join2(root, p3);
      }
      __name(toAbsolute, "toAbsolute");
      var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
      while (check.length) {
        var path = check.pop();
        var stat;
        try {
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
        if (FS.isDir(stat.mode)) {
          check.push(...FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
        }
        entries[path] = { timestamp: stat.mtime };
      }
      return callback(null, { type: "local", entries });
    }, getRemoteSet: (mount, callback) => {
      var entries = {};
      IDBFS.getDB(mount.mountpoint, (err2, db) => {
        if (err2)
          return callback(err2);
        try {
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
          transaction.onerror = (e) => {
            callback(e.target.error);
            e.preventDefault();
          };
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index("timestamp");
          index.openKeyCursor().onsuccess = (event) => {
            var cursor = event.target.result;
            if (!cursor) {
              return callback(null, { type: "remote", db, entries });
            }
            entries[cursor.primaryKey] = { timestamp: cursor.key };
            cursor.continue();
          };
        } catch (e) {
          return callback(e);
        }
      });
    }, loadLocalEntry: (path, callback) => {
      var stat, node;
      try {
        var lookup = FS.lookupPath(path);
        node = lookup.node;
        stat = FS.stat(path);
      } catch (e) {
        return callback(e);
      }
      if (FS.isDir(stat.mode)) {
        return callback(null, { timestamp: stat.mtime, mode: stat.mode });
      } else if (FS.isFile(stat.mode)) {
        node.contents = MEMFS.getFileDataAsTypedArray(node);
        return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
      } else {
        return callback(new Error("node type not supported"));
      }
    }, storeLocalEntry: (path, entry, callback) => {
      try {
        if (FS.isDir(entry["mode"])) {
          FS.mkdirTree(path, entry["mode"]);
        } else if (FS.isFile(entry["mode"])) {
          FS.writeFile(path, entry["contents"], { canOwn: true });
        } else {
          return callback(new Error("node type not supported"));
        }
        FS.chmod(path, entry["mode"]);
        FS.utime(path, entry["timestamp"], entry["timestamp"]);
      } catch (e) {
        return callback(e);
      }
      callback(null);
    }, removeLocalEntry: (path, callback) => {
      try {
        var stat = FS.stat(path);
        if (FS.isDir(stat.mode)) {
          FS.rmdir(path);
        } else if (FS.isFile(stat.mode)) {
          FS.unlink(path);
        }
      } catch (e) {
        return callback(e);
      }
      callback(null);
    }, loadRemoteEntry: (store, path, callback) => {
      var req = store.get(path);
      req.onsuccess = (event) => callback(null, event.target.result);
      req.onerror = (e) => {
        callback(e.target.error);
        e.preventDefault();
      };
    }, storeRemoteEntry: (store, path, entry, callback) => {
      try {
        var req = store.put(entry, path);
      } catch (e) {
        callback(e);
        return;
      }
      req.onsuccess = (event) => callback();
      req.onerror = (e) => {
        callback(e.target.error);
        e.preventDefault();
      };
    }, removeRemoteEntry: (store, path, callback) => {
      var req = store.delete(path);
      req.onsuccess = (event) => callback();
      req.onerror = (e) => {
        callback(e.target.error);
        e.preventDefault();
      };
    }, reconcile: (src, dst, callback) => {
      var total = 0;
      var create = [];
      Object.keys(src.entries).forEach((key) => {
        var e = src.entries[key];
        var e2 = dst.entries[key];
        if (!e2 || e["timestamp"].getTime() != e2["timestamp"].getTime()) {
          create.push(key);
          total++;
        }
      });
      var remove = [];
      Object.keys(dst.entries).forEach((key) => {
        if (!src.entries[key]) {
          remove.push(key);
          total++;
        }
      });
      if (!total) {
        return callback(null);
      }
      var errored = false;
      var db = src.type === "remote" ? src.db : dst.db;
      var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
      var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
      function done(err2) {
        if (err2 && !errored) {
          errored = true;
          return callback(err2);
        }
      }
      __name(done, "done");
      transaction.onerror = transaction.onabort = (e) => {
        done(e.target.error);
        e.preventDefault();
      };
      transaction.oncomplete = (e) => {
        if (!errored) {
          callback(null);
        }
      };
      create.sort().forEach((path) => {
        if (dst.type === "local") {
          IDBFS.loadRemoteEntry(store, path, (err2, entry) => {
            if (err2)
              return done(err2);
            IDBFS.storeLocalEntry(path, entry, done);
          });
        } else {
          IDBFS.loadLocalEntry(path, (err2, entry) => {
            if (err2)
              return done(err2);
            IDBFS.storeRemoteEntry(store, path, entry, done);
          });
        }
      });
      remove.sort().reverse().forEach((path) => {
        if (dst.type === "local") {
          IDBFS.removeLocalEntry(path, done);
        } else {
          IDBFS.removeRemoteEntry(store, path, done);
        }
      });
    } };
    var ERRNO_CODES = { EPERM: 63, ENOENT: 44, ESRCH: 71, EINTR: 27, EIO: 29, ENXIO: 60, E2BIG: 1, ENOEXEC: 45, EBADF: 8, ECHILD: 12, EAGAIN: 6, EWOULDBLOCK: 6, ENOMEM: 48, EACCES: 2, EFAULT: 21, ENOTBLK: 105, EBUSY: 10, EEXIST: 20, EXDEV: 75, ENODEV: 43, ENOTDIR: 54, EISDIR: 31, EINVAL: 28, ENFILE: 41, EMFILE: 33, ENOTTY: 59, ETXTBSY: 74, EFBIG: 22, ENOSPC: 51, ESPIPE: 70, EROFS: 69, EMLINK: 34, EPIPE: 64, EDOM: 18, ERANGE: 68, ENOMSG: 49, EIDRM: 24, ECHRNG: 106, EL2NSYNC: 156, EL3HLT: 107, EL3RST: 108, ELNRNG: 109, EUNATCH: 110, ENOCSI: 111, EL2HLT: 112, EDEADLK: 16, ENOLCK: 46, EBADE: 113, EBADR: 114, EXFULL: 115, ENOANO: 104, EBADRQC: 103, EBADSLT: 102, EDEADLOCK: 16, EBFONT: 101, ENOSTR: 100, ENODATA: 116, ETIME: 117, ENOSR: 118, ENONET: 119, ENOPKG: 120, EREMOTE: 121, ENOLINK: 47, EADV: 122, ESRMNT: 123, ECOMM: 124, EPROTO: 65, EMULTIHOP: 36, EDOTDOT: 125, EBADMSG: 9, ENOTUNIQ: 126, EBADFD: 127, EREMCHG: 128, ELIBACC: 129, ELIBBAD: 130, ELIBSCN: 131, ELIBMAX: 132, ELIBEXEC: 133, ENOSYS: 52, ENOTEMPTY: 55, ENAMETOOLONG: 37, ELOOP: 32, EOPNOTSUPP: 138, EPFNOSUPPORT: 139, ECONNRESET: 15, ENOBUFS: 42, EAFNOSUPPORT: 5, EPROTOTYPE: 67, ENOTSOCK: 57, ENOPROTOOPT: 50, ESHUTDOWN: 140, ECONNREFUSED: 14, EADDRINUSE: 3, ECONNABORTED: 13, ENETUNREACH: 40, ENETDOWN: 38, ETIMEDOUT: 73, EHOSTDOWN: 142, EHOSTUNREACH: 23, EINPROGRESS: 26, EALREADY: 7, EDESTADDRREQ: 17, EMSGSIZE: 35, EPROTONOSUPPORT: 66, ESOCKTNOSUPPORT: 137, EADDRNOTAVAIL: 4, ENETRESET: 39, EISCONN: 30, ENOTCONN: 53, ETOOMANYREFS: 141, EUSERS: 136, EDQUOT: 19, ESTALE: 72, ENOTSUP: 138, ENOMEDIUM: 148, EILSEQ: 25, EOVERFLOW: 61, ECANCELED: 11, ENOTRECOVERABLE: 56, EOWNERDEAD: 62, ESTRPIPE: 135 };
    var NODEFS = { isWindows: false, staticInit() {
      NODEFS.isWindows = !!process.platform.match(/^win/);
      var flags2 = process.binding("constants");
      if (flags2["fs"]) {
        flags2 = flags2["fs"];
      }
      NODEFS.flagsForNodeMap = { 1024: flags2["O_APPEND"], 64: flags2["O_CREAT"], 128: flags2["O_EXCL"], 256: flags2["O_NOCTTY"], 0: flags2["O_RDONLY"], 2: flags2["O_RDWR"], 4096: flags2["O_SYNC"], 512: flags2["O_TRUNC"], 1: flags2["O_WRONLY"], 131072: flags2["O_NOFOLLOW"] };
    }, convertNodeCode(e) {
      var code = e.code;
      return ERRNO_CODES[code];
    }, tryFSOperation(f2) {
      try {
        return f2();
      } catch (e) {
        if (!e.code)
          throw e;
        if (e.code === "UNKNOWN")
          throw new FS.ErrnoError(28);
        throw new FS.ErrnoError(NODEFS.convertNodeCode(e));
      }
    }, mount(mount) {
      return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0);
    }, createNode(parent, name2, mode, dev) {
      if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
        throw new FS.ErrnoError(28);
      }
      var node = FS.createNode(parent, name2, mode);
      node.node_ops = NODEFS.node_ops;
      node.stream_ops = NODEFS.stream_ops;
      return node;
    }, getMode(path) {
      return NODEFS.tryFSOperation(() => {
        var mode = fs.lstatSync(path).mode;
        if (NODEFS.isWindows) {
          mode |= (mode & 292) >> 2;
        }
        return mode;
      });
    }, realPath(node) {
      var parts2 = [];
      while (node.parent !== node) {
        parts2.push(node.name);
        node = node.parent;
      }
      parts2.push(node.mount.opts.root);
      parts2.reverse();
      return PATH.join(...parts2);
    }, flagsForNode(flags2) {
      flags2 &= ~2097152;
      flags2 &= ~2048;
      flags2 &= ~32768;
      flags2 &= ~524288;
      flags2 &= ~65536;
      var newFlags = 0;
      for (var k2 in NODEFS.flagsForNodeMap) {
        if (flags2 & k2) {
          newFlags |= NODEFS.flagsForNodeMap[k2];
          flags2 ^= k2;
        }
      }
      if (flags2) {
        throw new FS.ErrnoError(28);
      }
      return newFlags;
    }, node_ops: { getattr(node) {
      var path = NODEFS.realPath(node);
      var stat;
      NODEFS.tryFSOperation(() => stat = fs.lstatSync(path));
      if (NODEFS.isWindows) {
        if (!stat.blksize) {
          stat.blksize = 4096;
        }
        if (!stat.blocks) {
          stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0;
        }
        stat.mode |= (stat.mode & 292) >> 2;
      }
      return { dev: stat.dev, ino: stat.ino, mode: stat.mode, nlink: stat.nlink, uid: stat.uid, gid: stat.gid, rdev: stat.rdev, size: stat.size, atime: stat.atime, mtime: stat.mtime, ctime: stat.ctime, blksize: stat.blksize, blocks: stat.blocks };
    }, setattr(node, attr) {
      var path = NODEFS.realPath(node);
      NODEFS.tryFSOperation(() => {
        if (attr.mode !== void 0) {
          var mode = attr.mode;
          if (NODEFS.isWindows) {
            mode &= 384;
          }
          fs.chmodSync(path, mode);
          node.mode = attr.mode;
        }
        if (attr.atime || attr.mtime) {
          var atime = attr.atime && new Date(attr.atime);
          var mtime = attr.mtime && new Date(attr.mtime);
          fs.utimesSync(path, atime, mtime);
        }
        if (attr.size !== void 0) {
          fs.truncateSync(path, attr.size);
        }
      });
    }, lookup(parent, name2) {
      var path = PATH.join2(NODEFS.realPath(parent), name2);
      var mode = NODEFS.getMode(path);
      return NODEFS.createNode(parent, name2, mode);
    }, mknod(parent, name2, mode, dev) {
      var node = NODEFS.createNode(parent, name2, mode, dev);
      var path = NODEFS.realPath(node);
      NODEFS.tryFSOperation(() => {
        if (FS.isDir(node.mode)) {
          fs.mkdirSync(path, node.mode);
        } else {
          fs.writeFileSync(path, "", { mode: node.mode });
        }
      });
      return node;
    }, rename(oldNode, newDir, newName) {
      var oldPath = NODEFS.realPath(oldNode);
      var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
      try {
        FS.unlink(newPath);
      } catch (e) {
      }
      NODEFS.tryFSOperation(() => fs.renameSync(oldPath, newPath));
      oldNode.name = newName;
    }, unlink(parent, name2) {
      var path = PATH.join2(NODEFS.realPath(parent), name2);
      NODEFS.tryFSOperation(() => fs.unlinkSync(path));
    }, rmdir(parent, name2) {
      var path = PATH.join2(NODEFS.realPath(parent), name2);
      NODEFS.tryFSOperation(() => fs.rmdirSync(path));
    }, readdir(node) {
      var path = NODEFS.realPath(node);
      return NODEFS.tryFSOperation(() => fs.readdirSync(path));
    }, symlink(parent, newName, oldPath) {
      var newPath = PATH.join2(NODEFS.realPath(parent), newName);
      NODEFS.tryFSOperation(() => fs.symlinkSync(oldPath, newPath));
    }, readlink(node) {
      var path = NODEFS.realPath(node);
      return NODEFS.tryFSOperation(() => fs.readlinkSync(path));
    }, statfs(path) {
      var stats = NODEFS.tryFSOperation(() => fs.statfsSync(path));
      stats.frsize = stats.bsize;
      return stats;
    } }, stream_ops: { open(stream) {
      var path = NODEFS.realPath(stream.node);
      NODEFS.tryFSOperation(() => {
        if (FS.isFile(stream.node.mode)) {
          stream.shared.refcount = 1;
          stream.nfd = fs.openSync(path, NODEFS.flagsForNode(stream.flags));
        }
      });
    }, close(stream) {
      NODEFS.tryFSOperation(() => {
        if (FS.isFile(stream.node.mode) && stream.nfd && --stream.shared.refcount === 0) {
          fs.closeSync(stream.nfd);
        }
      });
    }, dup(stream) {
      stream.shared.refcount++;
    }, read(stream, buffer, offset, length, position) {
      if (length === 0)
        return 0;
      return NODEFS.tryFSOperation(() => fs.readSync(stream.nfd, new Int8Array(buffer.buffer, offset, length), 0, length, position));
    }, write(stream, buffer, offset, length, position) {
      return NODEFS.tryFSOperation(() => fs.writeSync(stream.nfd, new Int8Array(buffer.buffer, offset, length), 0, length, position));
    }, llseek(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          NODEFS.tryFSOperation(() => {
            var stat = fs.fstatSync(stream.nfd);
            position += stat.size;
          });
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    }, mmap(stream, length, position, prot, flags2) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr = mmapAlloc(length);
      NODEFS.stream_ops.read(stream, HEAP8, ptr, length, position);
      return { ptr, allocated: true };
    }, msync(stream, buffer, offset, length, mmapFlags) {
      NODEFS.stream_ops.write(stream, buffer, 0, length, offset, false);
      return 0;
    } } };
    var FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, ErrnoError: class {
      name = "ErrnoError";
      constructor(errno) {
        this.errno = errno;
      }
    }, filesystems: null, syncFSRequests: 0, readFiles: {}, FSStream: class {
      shared = {};
      get object() {
        return this.node;
      }
      set object(val) {
        this.node = val;
      }
      get isRead() {
        return (this.flags & 2097155) !== 1;
      }
      get isWrite() {
        return (this.flags & 2097155) !== 0;
      }
      get isAppend() {
        return this.flags & 1024;
      }
      get flags() {
        return this.shared.flags;
      }
      set flags(val) {
        this.shared.flags = val;
      }
      get position() {
        return this.shared.position;
      }
      set position(val) {
        this.shared.position = val;
      }
    }, FSNode: class {
      node_ops = {};
      stream_ops = {};
      readMode = 292 | 73;
      writeMode = 146;
      mounted = null;
      constructor(parent, name2, mode, rdev) {
        if (!parent) {
          parent = this;
        }
        this.parent = parent;
        this.mount = parent.mount;
        this.id = FS.nextInode++;
        this.name = name2;
        this.mode = mode;
        this.rdev = rdev;
        this.atime = this.mtime = this.ctime = Date.now();
      }
      get read() {
        return (this.mode & this.readMode) === this.readMode;
      }
      set read(val) {
        val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
      }
      get write() {
        return (this.mode & this.writeMode) === this.writeMode;
      }
      set write(val) {
        val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
      }
      get isFolder() {
        return FS.isDir(this.mode);
      }
      get isDevice() {
        return FS.isChrdev(this.mode);
      }
    }, lookupPath(path, opts = {}) {
      if (!path)
        return { path: "", node: null };
      opts.follow_mount ??= true;
      if (!PATH.isAbs(path)) {
        path = FS.cwd() + "/" + path;
      }
      linkloop:
        for (var nlinks = 0; nlinks < 40; nlinks++) {
          var parts2 = path.split("/").filter((p3) => !!p3 && p3 !== ".");
          var current = FS.root;
          var current_path = "/";
          for (var i2 = 0; i2 < parts2.length; i2++) {
            var islast = i2 === parts2.length - 1;
            if (islast && opts.parent) {
              break;
            }
            if (parts2[i2] === "..") {
              current_path = PATH.dirname(current_path);
              current = current.parent;
              continue;
            }
            current_path = PATH.join2(current_path, parts2[i2]);
            try {
              current = FS.lookupNode(current, parts2[i2]);
            } catch (e) {
              if (e?.errno === 44 && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + "/" + link;
              }
              path = link + "/" + parts2.slice(i2 + 1).join("/");
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
      throw new FS.ErrnoError(32);
    }, getPath(node) {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path)
            return mount;
          return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
        }
        path = path ? `${node.name}/${path}` : node.name;
        node = node.parent;
      }
    }, hashName(parentid, name2) {
      var hash = 0;
      for (var i2 = 0; i2 < name2.length; i2++) {
        hash = (hash << 5) - hash + name2.charCodeAt(i2) | 0;
      }
      return (parentid + hash >>> 0) % FS.nameTable.length;
    }, hashAddNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node;
    }, hashRemoveNode(node) {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) {
        FS.nameTable[hash] = node.name_next;
      } else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break;
          }
          current = current.name_next;
        }
      }
    }, lookupNode(parent, name2) {
      var errCode = FS.mayLookup(parent);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      var hash = FS.hashName(parent.id, name2);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name2) {
          return node;
        }
      }
      return FS.lookup(parent, name2);
    }, createNode(parent, name2, mode, rdev) {
      var node = new FS.FSNode(parent, name2, mode, rdev);
      FS.hashAddNode(node);
      return node;
    }, destroyNode(node) {
      FS.hashRemoveNode(node);
    }, isRoot(node) {
      return node === node.parent;
    }, isMountpoint(node) {
      return !!node.mounted;
    }, isFile(mode) {
      return (mode & 61440) === 32768;
    }, isDir(mode) {
      return (mode & 61440) === 16384;
    }, isLink(mode) {
      return (mode & 61440) === 40960;
    }, isChrdev(mode) {
      return (mode & 61440) === 8192;
    }, isBlkdev(mode) {
      return (mode & 61440) === 24576;
    }, isFIFO(mode) {
      return (mode & 61440) === 4096;
    }, isSocket(mode) {
      return (mode & 49152) === 49152;
    }, flagsToPermissionString(flag) {
      var perms = ["r", "w", "rw"][flag & 3];
      if (flag & 512) {
        perms += "w";
      }
      return perms;
    }, nodePermissions(node, perms) {
      if (FS.ignorePermissions) {
        return 0;
      }
      if (perms.includes("r") && !(node.mode & 292)) {
        return 2;
      } else if (perms.includes("w") && !(node.mode & 146)) {
        return 2;
      } else if (perms.includes("x") && !(node.mode & 73)) {
        return 2;
      }
      return 0;
    }, mayLookup(dir3) {
      if (!FS.isDir(dir3.mode))
        return 54;
      var errCode = FS.nodePermissions(dir3, "x");
      if (errCode)
        return errCode;
      if (!dir3.node_ops.lookup)
        return 2;
      return 0;
    }, mayCreate(dir3, name2) {
      if (!FS.isDir(dir3.mode)) {
        return 54;
      }
      try {
        var node = FS.lookupNode(dir3, name2);
        return 20;
      } catch (e) {
      }
      return FS.nodePermissions(dir3, "wx");
    }, mayDelete(dir3, name2, isdir) {
      var node;
      try {
        node = FS.lookupNode(dir3, name2);
      } catch (e) {
        return e.errno;
      }
      var errCode = FS.nodePermissions(dir3, "wx");
      if (errCode) {
        return errCode;
      }
      if (isdir) {
        if (!FS.isDir(node.mode)) {
          return 54;
        }
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
          return 10;
        }
      } else {
        if (FS.isDir(node.mode)) {
          return 31;
        }
      }
      return 0;
    }, mayOpen(node, flags2) {
      if (!node) {
        return 44;
      }
      if (FS.isLink(node.mode)) {
        return 32;
      } else if (FS.isDir(node.mode)) {
        if (FS.flagsToPermissionString(flags2) !== "r" || flags2 & 512) {
          return 31;
        }
      }
      return FS.nodePermissions(node, FS.flagsToPermissionString(flags2));
    }, MAX_OPEN_FDS: 4096, nextfd() {
      for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
        if (!FS.streams[fd]) {
          return fd;
        }
      }
      throw new FS.ErrnoError(33);
    }, getStreamChecked(fd) {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      return stream;
    }, getStream: (fd) => FS.streams[fd], createStream(stream, fd = -1) {
      stream = Object.assign(new FS.FSStream(), stream);
      if (fd == -1) {
        fd = FS.nextfd();
      }
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream;
    }, closeStream(fd) {
      FS.streams[fd] = null;
    }, dupStream(origStream, fd = -1) {
      var stream = FS.createStream(origStream, fd);
      stream.stream_ops?.dup?.(stream);
      return stream;
    }, chrdev_stream_ops: { open(stream) {
      var device = FS.getDevice(stream.node.rdev);
      stream.stream_ops = device.stream_ops;
      stream.stream_ops.open?.(stream);
    }, llseek() {
      throw new FS.ErrnoError(70);
    } }, major: (dev) => dev >> 8, minor: (dev) => dev & 255, makedev: (ma, mi) => ma << 8 | mi, registerDevice(dev, ops) {
      FS.devices[dev] = { stream_ops: ops };
    }, getDevice: (dev) => FS.devices[dev], getMounts(mount) {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m3 = check.pop();
        mounts.push(m3);
        check.push(...m3.mounts);
      }
      return mounts;
    }, syncfs(populate, callback) {
      if (typeof populate == "function") {
        callback = populate;
        populate = false;
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) {
        err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
      }
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;
      function doCallback(errCode) {
        FS.syncFSRequests--;
        return callback(errCode);
      }
      __name(doCallback, "doCallback");
      function done(errCode) {
        if (errCode) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(errCode);
          }
          return;
        }
        if (++completed >= mounts.length) {
          doCallback(null);
        }
      }
      __name(done, "done");
      mounts.forEach((mount) => {
        if (!mount.type.syncfs) {
          return done(null);
        }
        mount.type.syncfs(mount, populate, done);
      });
    }, mount(type, opts, mountpoint) {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) {
        throw new FS.ErrnoError(10);
      } else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        if (!FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
      }
      var mount = { type, opts, mountpoint, mounts: [] };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) {
        FS.root = mountRoot;
      } else if (node) {
        node.mounted = mount;
        if (node.mount) {
          node.mount.mounts.push(mount);
        }
      }
      return mountRoot;
    }, unmount(mountpoint) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      if (!FS.isMountpoint(lookup.node)) {
        throw new FS.ErrnoError(28);
      }
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      Object.keys(FS.nameTable).forEach((hash) => {
        var current = FS.nameTable[hash];
        while (current) {
          var next = current.name_next;
          if (mounts.includes(current.mount)) {
            FS.destroyNode(current);
          }
          current = next;
        }
      });
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      node.mount.mounts.splice(idx, 1);
    }, lookup(parent, name2) {
      return parent.node_ops.lookup(parent, name2);
    }, mknod(path, mode, dev) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name2 = PATH.basename(path);
      if (!name2 || name2 === "." || name2 === "..") {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.mayCreate(parent, name2);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.mknod) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.mknod(parent, name2, mode, dev);
    }, statfs(path) {
      var rtn = { bsize: 4096, frsize: 4096, blocks: 1e6, bfree: 5e5, bavail: 5e5, files: FS.nextInode, ffree: FS.nextInode - 1, fsid: 42, flags: 2, namelen: 255 };
      var parent = FS.lookupPath(path, { follow: true }).node;
      if (parent?.node_ops.statfs) {
        Object.assign(rtn, parent.node_ops.statfs(parent.mount.opts.root));
      }
      return rtn;
    }, create(path, mode = 438) {
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0);
    }, mkdir(path, mode = 511) {
      mode &= 511 | 512;
      mode |= 16384;
      return FS.mknod(path, mode, 0);
    }, mkdirTree(path, mode) {
      var dirs = path.split("/");
      var d3 = "";
      for (var i2 = 0; i2 < dirs.length; ++i2) {
        if (!dirs[i2])
          continue;
        d3 += "/" + dirs[i2];
        try {
          FS.mkdir(d3, mode);
        } catch (e) {
          if (e.errno != 20)
            throw e;
        }
      }
    }, mkdev(path, mode, dev) {
      if (typeof dev == "undefined") {
        dev = mode;
        mode = 438;
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev);
    }, symlink(oldpath, newpath) {
      if (!PATH_FS.resolve(oldpath)) {
        throw new FS.ErrnoError(44);
      }
      var lookup = FS.lookupPath(newpath, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.symlink) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.symlink(parent, newname, oldpath);
    }, rename(old_path, new_path) {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup, old_dir, new_dir;
      lookup = FS.lookupPath(old_path, { parent: true });
      old_dir = lookup.node;
      lookup = FS.lookupPath(new_path, { parent: true });
      new_dir = lookup.node;
      if (!old_dir || !new_dir)
        throw new FS.ErrnoError(44);
      if (old_dir.mount !== new_dir.mount) {
        throw new FS.ErrnoError(75);
      }
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH_FS.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(28);
      }
      relative = PATH_FS.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(55);
      }
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (old_node === new_node) {
        return;
      }
      var isdir = FS.isDir(old_node.mode);
      var errCode = FS.mayDelete(old_dir, old_name, isdir);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!old_dir.node_ops.rename) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
        throw new FS.ErrnoError(10);
      }
      if (new_dir !== old_dir) {
        errCode = FS.nodePermissions(old_dir, "w");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name);
        old_node.parent = new_dir;
      } catch (e) {
        throw e;
      } finally {
        FS.hashAddNode(old_node);
      }
    }, rmdir(path) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name2 = PATH.basename(path);
      var node = FS.lookupNode(parent, name2);
      var errCode = FS.mayDelete(parent, name2, true);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.rmdir) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.rmdir(parent, name2);
      FS.destroyNode(node);
    }, readdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      if (!node.node_ops.readdir) {
        throw new FS.ErrnoError(54);
      }
      return node.node_ops.readdir(node);
    }, unlink(path) {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var name2 = PATH.basename(path);
      var node = FS.lookupNode(parent, name2);
      var errCode = FS.mayDelete(parent, name2, false);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.unlink) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.unlink(parent, name2);
      FS.destroyNode(node);
    }, readlink(path) {
      var lookup = FS.lookupPath(path);
      var link = lookup.node;
      if (!link) {
        throw new FS.ErrnoError(44);
      }
      if (!link.node_ops.readlink) {
        throw new FS.ErrnoError(28);
      }
      return link.node_ops.readlink(link);
    }, stat(path, dontFollow) {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      var node = lookup.node;
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (!node.node_ops.getattr) {
        throw new FS.ErrnoError(63);
      }
      return node.node_ops.getattr(node);
    }, lstat(path) {
      return FS.stat(path, true);
    }, chmod(path, mode, dontFollow) {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      node.node_ops.setattr(node, { mode: mode & 4095 | node.mode & ~4095, ctime: Date.now() });
    }, lchmod(path, mode) {
      FS.chmod(path, mode, true);
    }, fchmod(fd, mode) {
      var stream = FS.getStreamChecked(fd);
      FS.chmod(stream.node, mode);
    }, chown(path, uid, gid, dontFollow) {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      node.node_ops.setattr(node, { timestamp: Date.now() });
    }, lchown(path, uid, gid) {
      FS.chown(path, uid, gid, true);
    }, fchown(fd, uid, gid) {
      var stream = FS.getStreamChecked(fd);
      FS.chown(stream.node, uid, gid);
    }, truncate(path, len) {
      if (len < 0) {
        throw new FS.ErrnoError(28);
      }
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isDir(node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!FS.isFile(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.nodePermissions(node, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      node.node_ops.setattr(node, { size: len, timestamp: Date.now() });
    }, ftruncate(fd, len) {
      var stream = FS.getStreamChecked(fd);
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(28);
      }
      FS.truncate(stream.node, len);
    }, utime(path, atime, mtime) {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      node.node_ops.setattr(node, { atime, mtime });
    }, open(path, flags2, mode = 438) {
      if (path === "") {
        throw new FS.ErrnoError(44);
      }
      flags2 = typeof flags2 == "string" ? FS_modeStringToFlags(flags2) : flags2;
      if (flags2 & 64) {
        mode = mode & 4095 | 32768;
      } else {
        mode = 0;
      }
      var node;
      if (typeof path == "object") {
        node = path;
      } else {
        var lookup = FS.lookupPath(path, { follow: !(flags2 & 131072), noent_okay: true });
        node = lookup.node;
        path = lookup.path;
      }
      var created = false;
      if (flags2 & 64) {
        if (node) {
          if (flags2 & 128) {
            throw new FS.ErrnoError(20);
          }
        } else {
          node = FS.mknod(path, mode, 0);
          created = true;
        }
      }
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (FS.isChrdev(node.mode)) {
        flags2 &= ~512;
      }
      if (flags2 & 65536 && !FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
      if (!created) {
        var errCode = FS.mayOpen(node, flags2);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      if (flags2 & 512 && !created) {
        FS.truncate(node, 0);
      }
      flags2 &= ~(128 | 512 | 131072);
      var stream = FS.createStream({ node, path: FS.getPath(node), flags: flags2, seekable: true, position: 0, stream_ops: node.stream_ops, ungotten: [], error: false });
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream);
      }
      if (Module["logReadFiles"] && !(flags2 & 1)) {
        if (!(path in FS.readFiles)) {
          FS.readFiles[path] = 1;
        }
      }
      return stream;
    }, close(stream) {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (stream.getdents)
        stream.getdents = null;
      try {
        if (stream.stream_ops.close) {
          stream.stream_ops.close(stream);
        }
      } catch (e) {
        throw e;
      } finally {
        FS.closeStream(stream.fd);
      }
      stream.fd = null;
    }, isClosed(stream) {
      return stream.fd === null;
    }, llseek(stream, offset, whence) {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (!stream.seekable || !stream.stream_ops.llseek) {
        throw new FS.ErrnoError(70);
      }
      if (whence != 0 && whence != 1 && whence != 2) {
        throw new FS.ErrnoError(28);
      }
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position;
    }, read(stream, buffer, offset, length, position) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.read) {
        throw new FS.ErrnoError(28);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
      if (!seeking)
        stream.position += bytesRead;
      return bytesRead;
    }, write(stream, buffer, offset, length, position, canOwn) {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.write) {
        throw new FS.ErrnoError(28);
      }
      if (stream.seekable && stream.flags & 1024) {
        FS.llseek(stream, 0, 2);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
      if (!seeking)
        stream.position += bytesWritten;
      return bytesWritten;
    }, allocate(stream, offset, length) {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (offset < 0 || length <= 0) {
        throw new FS.ErrnoError(28);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (!stream.stream_ops.allocate) {
        throw new FS.ErrnoError(138);
      }
      stream.stream_ops.allocate(stream, offset, length);
    }, mmap(stream, length, position, prot, flags2) {
      if ((prot & 2) !== 0 && (flags2 & 2) === 0 && (stream.flags & 2097155) !== 2) {
        throw new FS.ErrnoError(2);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(2);
      }
      if (!stream.stream_ops.mmap) {
        throw new FS.ErrnoError(43);
      }
      if (!length) {
        throw new FS.ErrnoError(28);
      }
      return stream.stream_ops.mmap(stream, length, position, prot, flags2);
    }, msync(stream, buffer, offset, length, mmapFlags) {
      if (!stream.stream_ops.msync) {
        return 0;
      }
      return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
    }, ioctl(stream, cmd, arg) {
      if (!stream.stream_ops.ioctl) {
        throw new FS.ErrnoError(59);
      }
      return stream.stream_ops.ioctl(stream, cmd, arg);
    }, readFile(path, opts = {}) {
      opts.flags = opts.flags || 0;
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
        throw new Error(`Invalid encoding type "${opts.encoding}"`);
      }
      var ret;
      var stream = FS.open(path, opts.flags);
      var stat = FS.stat(path);
      var length = stat.size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") {
        ret = UTF8ArrayToString(buf);
      } else if (opts.encoding === "binary") {
        ret = buf;
      }
      FS.close(stream);
      return ret;
    }, writeFile(path, data, opts = {}) {
      opts.flags = opts.flags || 577;
      var stream = FS.open(path, opts.flags, opts.mode);
      if (typeof data == "string") {
        var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
        var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
        FS.write(stream, buf, 0, actualNumBytes, void 0, opts.canOwn);
      } else if (ArrayBuffer.isView(data)) {
        FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
      } else {
        throw new Error("Unsupported data type");
      }
      FS.close(stream);
    }, cwd: () => FS.currentPath, chdir(path) {
      var lookup = FS.lookupPath(path, { follow: true });
      if (lookup.node === null) {
        throw new FS.ErrnoError(44);
      }
      if (!FS.isDir(lookup.node.mode)) {
        throw new FS.ErrnoError(54);
      }
      var errCode = FS.nodePermissions(lookup.node, "x");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      FS.currentPath = lookup.path;
    }, createDefaultDirectories() {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user");
    }, createDefaultDevices() {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer, offset, length, pos) => length, llseek: () => 0 });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var randomBuffer = new Uint8Array(1024), randomLeft = 0;
      var randomByte = /* @__PURE__ */ __name(() => {
        if (randomLeft === 0) {
          randomLeft = randomFill(randomBuffer).byteLength;
        }
        return randomBuffer[--randomLeft];
      }, "randomByte");
      FS.createDevice("/dev", "random", randomByte);
      FS.createDevice("/dev", "urandom", randomByte);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp");
    }, createSpecialDirectories() {
      FS.mkdir("/proc");
      var proc_self = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({ mount() {
        var node = FS.createNode(proc_self, "fd", 16895, 73);
        node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
        node.node_ops = { lookup(parent, name2) {
          var fd = +name2;
          var stream = FS.getStreamChecked(fd);
          var ret = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => stream.path }, id: fd + 1 };
          ret.parent = ret;
          return ret;
        }, readdir() {
          return Array.from(FS.streams.entries()).filter(([k2, v]) => v).map(([k2, v]) => k2.toString());
        } };
        return node;
      } }, {}, "/proc/self/fd");
    }, createStandardStreams(input, output, error3) {
      if (input) {
        FS.createDevice("/dev", "stdin", input);
      } else {
        FS.symlink("/dev/tty", "/dev/stdin");
      }
      if (output) {
        FS.createDevice("/dev", "stdout", null, output);
      } else {
        FS.symlink("/dev/tty", "/dev/stdout");
      }
      if (error3) {
        FS.createDevice("/dev", "stderr", null, error3);
      } else {
        FS.symlink("/dev/tty1", "/dev/stderr");
      }
      var stdin2 = FS.open("/dev/stdin", 0);
      var stdout2 = FS.open("/dev/stdout", 1);
      var stderr2 = FS.open("/dev/stderr", 1);
    }, staticInit() {
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = { MEMFS, IDBFS, NODEFS };
    }, init(input, output, error3) {
      FS.initialized = true;
      input ??= Module["stdin"];
      output ??= Module["stdout"];
      error3 ??= Module["stderr"];
      FS.createStandardStreams(input, output, error3);
    }, quit() {
      FS.initialized = false;
      _fflush(0);
      for (var i2 = 0; i2 < FS.streams.length; i2++) {
        var stream = FS.streams[i2];
        if (!stream) {
          continue;
        }
        FS.close(stream);
      }
    }, findObject(path, dontResolveLastLink) {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (!ret.exists) {
        return null;
      }
      return ret.object;
    }, analyzePath(path, dontResolveLastLink) {
      try {
        var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        path = lookup.path;
      } catch (e) {
      }
      var ret = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
      try {
        var lookup = FS.lookupPath(path, { parent: true });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/";
      } catch (e) {
        ret.error = e.errno;
      }
      return ret;
    }, createPath(parent, path, canRead, canWrite) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      var parts2 = path.split("/").reverse();
      while (parts2.length) {
        var part = parts2.pop();
        if (!part)
          continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current);
        } catch (e) {
        }
        parent = current;
      }
      return current;
    }, createFile(parent, name2, properties, canRead, canWrite) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name2);
      var mode = FS_getMode(canRead, canWrite);
      return FS.create(path, mode);
    }, createDataFile(parent, name2, data, canRead, canWrite, canOwn) {
      var path = name2;
      if (parent) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        path = name2 ? PATH.join2(parent, name2) : parent;
      }
      var mode = FS_getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        if (typeof data == "string") {
          var arr = new Array(data.length);
          for (var i2 = 0, len = data.length; i2 < len; ++i2)
            arr[i2] = data.charCodeAt(i2);
          data = arr;
        }
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode);
      }
    }, createDevice(parent, name2, input, output) {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name2);
      var mode = FS_getMode(!!input, !!output);
      FS.createDevice.major ??= 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, { open(stream) {
        stream.seekable = false;
      }, close(stream) {
        if (output?.buffer?.length) {
          output(10);
        }
      }, read(stream, buffer, offset, length, pos) {
        var bytesRead = 0;
        for (var i2 = 0; i2 < length; i2++) {
          var result;
          try {
            result = input();
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === void 0 && bytesRead === 0) {
            throw new FS.ErrnoError(6);
          }
          if (result === null || result === void 0)
            break;
          bytesRead++;
          buffer[offset + i2] = result;
        }
        if (bytesRead) {
          stream.node.atime = Date.now();
        }
        return bytesRead;
      }, write(stream, buffer, offset, length, pos) {
        for (var i2 = 0; i2 < length; i2++) {
          try {
            output(buffer[offset + i2]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
        if (length) {
          stream.node.mtime = stream.node.ctime = Date.now();
        }
        return i2;
      } });
      return FS.mkdev(path, mode, dev);
    }, forceLoadFile(obj) {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents)
        return true;
      if (typeof XMLHttpRequest != "undefined") {
        throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      } else {
        try {
          obj.contents = readBinary(obj.url);
          obj.usedBytes = obj.contents.length;
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      }
    }, createLazyFile(parent, name2, url, canRead, canWrite) {
      class LazyUint8Array {
        lengthKnown = false;
        chunks = [];
        get(idx) {
          if (idx > this.length - 1 || idx < 0) {
            return void 0;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = idx / this.chunkSize | 0;
          return this.getter(chunkNum)[chunkOffset];
        }
        setDataGetter(getter) {
          this.getter = getter;
        }
        cacheLength() {
          var xhr = new XMLHttpRequest();
          xhr.open("HEAD", url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))
            throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
          var chunkSize = 1024 * 1024;
          if (!hasByteServing)
            chunkSize = datalength;
          var doXHR = /* @__PURE__ */ __name((from, to) => {
            if (from > to)
              throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength - 1)
              throw new Error("only " + datalength + " bytes available! programmer error!");
            var xhr2 = new XMLHttpRequest();
            xhr2.open("GET", url, false);
            if (datalength !== chunkSize)
              xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
            xhr2.responseType = "arraybuffer";
            if (xhr2.overrideMimeType) {
              xhr2.overrideMimeType("text/plain; charset=x-user-defined");
            }
            xhr2.send(null);
            if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304))
              throw new Error("Couldn't load " + url + ". Status: " + xhr2.status);
            if (xhr2.response !== void 0) {
              return new Uint8Array(xhr2.response || []);
            }
            return intArrayFromString(xhr2.responseText || "", true);
          }, "doXHR");
          var lazyArray2 = this;
          lazyArray2.setDataGetter((chunkNum) => {
            var start2 = chunkNum * chunkSize;
            var end = (chunkNum + 1) * chunkSize - 1;
            end = Math.min(end, datalength - 1);
            if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
              lazyArray2.chunks[chunkNum] = doXHR(start2, end);
            }
            if (typeof lazyArray2.chunks[chunkNum] == "undefined")
              throw new Error("doXHR failed!");
            return lazyArray2.chunks[chunkNum];
          });
          if (usesGzip || !datalength) {
            chunkSize = datalength = 1;
            datalength = this.getter(0).length;
            chunkSize = datalength;
            out("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        get length() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._length;
        }
        get chunkSize() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._chunkSize;
        }
      }
      __name(LazyUint8Array, "LazyUint8Array");
      if (typeof XMLHttpRequest != "undefined") {
        if (!ENVIRONMENT_IS_WORKER)
          throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
        var lazyArray = new LazyUint8Array();
        var properties = { isDevice: false, contents: lazyArray };
      } else {
        var properties = { isDevice: false, url };
      }
      var node = FS.createFile(parent, name2, properties, canRead, canWrite);
      if (properties.contents) {
        node.contents = properties.contents;
      } else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      Object.defineProperties(node, { usedBytes: { get: function() {
        return this.contents.length;
      } } });
      var stream_ops = {};
      var keys = Object.keys(node.stream_ops);
      keys.forEach((key) => {
        var fn = node.stream_ops[key];
        stream_ops[key] = (...args2) => {
          FS.forceLoadFile(node);
          return fn(...args2);
        };
      });
      function writeChunks(stream, buffer, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= contents.length)
          return 0;
        var size = Math.min(contents.length - position, length);
        if (contents.slice) {
          for (var i2 = 0; i2 < size; i2++) {
            buffer[offset + i2] = contents[position + i2];
          }
        } else {
          for (var i2 = 0; i2 < size; i2++) {
            buffer[offset + i2] = contents.get(position + i2);
          }
        }
        return size;
      }
      __name(writeChunks, "writeChunks");
      stream_ops.read = (stream, buffer, offset, length, position) => {
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer, offset, length, position);
      };
      stream_ops.mmap = (stream, length, position, prot, flags2) => {
        FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        writeChunks(stream, HEAP8, ptr, length, position);
        return { ptr, allocated: true };
      };
      node.stream_ops = stream_ops;
      return node;
    } };
    var SYSCALLS = { DEFAULT_POLLMASK: 5, calculateAt(dirfd, path, allowEmpty) {
      if (PATH.isAbs(path)) {
        return path;
      }
      var dir3;
      if (dirfd === -100) {
        dir3 = FS.cwd();
      } else {
        var dirstream = SYSCALLS.getStreamFromFD(dirfd);
        dir3 = dirstream.path;
      }
      if (path.length == 0) {
        if (!allowEmpty) {
          throw new FS.ErrnoError(44);
        }
        return dir3;
      }
      return dir3 + "/" + path;
    }, doStat(func2, path, buf) {
      var stat = func2(path);
      HEAP32[buf >> 2] = stat.dev;
      HEAP32[buf + 4 >> 2] = stat.mode;
      HEAPU32[buf + 8 >> 2] = stat.nlink;
      HEAP32[buf + 12 >> 2] = stat.uid;
      HEAP32[buf + 16 >> 2] = stat.gid;
      HEAP32[buf + 20 >> 2] = stat.rdev;
      HEAP64[buf + 24 >> 3] = BigInt(stat.size);
      HEAP32[buf + 32 >> 2] = 4096;
      HEAP32[buf + 36 >> 2] = stat.blocks;
      var atime = stat.atime.getTime();
      var mtime = stat.mtime.getTime();
      var ctime = stat.ctime.getTime();
      HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
      HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
      HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
      HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
      HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
      return 0;
    }, doMsync(addr2, stream, len, flags2, offset) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (flags2 & 2) {
        return 0;
      }
      var buffer = HEAPU8.slice(addr2, addr2 + len);
      FS.msync(stream, buffer, offset, len, flags2);
    }, getStreamFromFD(fd) {
      var stream = FS.getStreamChecked(fd);
      return stream;
    }, varargs: void 0, getStr(ptr) {
      var ret = UTF8ToString(ptr);
      return ret;
    } };
    var ___syscall__newselect = /* @__PURE__ */ __name(function(nfds, readfds, writefds, exceptfds, timeout) {
      try {
        var total = 0;
        var srcReadLow = readfds ? HEAP32[readfds >> 2] : 0, srcReadHigh = readfds ? HEAP32[readfds + 4 >> 2] : 0;
        var srcWriteLow = writefds ? HEAP32[writefds >> 2] : 0, srcWriteHigh = writefds ? HEAP32[writefds + 4 >> 2] : 0;
        var srcExceptLow = exceptfds ? HEAP32[exceptfds >> 2] : 0, srcExceptHigh = exceptfds ? HEAP32[exceptfds + 4 >> 2] : 0;
        var dstReadLow = 0, dstReadHigh = 0;
        var dstWriteLow = 0, dstWriteHigh = 0;
        var dstExceptLow = 0, dstExceptHigh = 0;
        var allLow = (readfds ? HEAP32[readfds >> 2] : 0) | (writefds ? HEAP32[writefds >> 2] : 0) | (exceptfds ? HEAP32[exceptfds >> 2] : 0);
        var allHigh = (readfds ? HEAP32[readfds + 4 >> 2] : 0) | (writefds ? HEAP32[writefds + 4 >> 2] : 0) | (exceptfds ? HEAP32[exceptfds + 4 >> 2] : 0);
        var check = /* @__PURE__ */ __name((fd2, low, high, val) => fd2 < 32 ? low & val : high & val, "check");
        for (var fd = 0; fd < nfds; fd++) {
          var mask = 1 << fd % 32;
          if (!check(fd, allLow, allHigh, mask)) {
            continue;
          }
          var stream = SYSCALLS.getStreamFromFD(fd);
          var flags2 = SYSCALLS.DEFAULT_POLLMASK;
          if (stream.stream_ops.poll) {
            var timeoutInMillis = -1;
            if (timeout) {
              var tv_sec = readfds ? HEAP32[timeout >> 2] : 0, tv_usec = readfds ? HEAP32[timeout + 4 >> 2] : 0;
              timeoutInMillis = (tv_sec + tv_usec / 1e6) * 1e3;
            }
            flags2 = stream.stream_ops.poll(stream, timeoutInMillis);
          }
          if (flags2 & 1 && check(fd, srcReadLow, srcReadHigh, mask)) {
            fd < 32 ? dstReadLow = dstReadLow | mask : dstReadHigh = dstReadHigh | mask;
            total++;
          }
          if (flags2 & 4 && check(fd, srcWriteLow, srcWriteHigh, mask)) {
            fd < 32 ? dstWriteLow = dstWriteLow | mask : dstWriteHigh = dstWriteHigh | mask;
            total++;
          }
          if (flags2 & 2 && check(fd, srcExceptLow, srcExceptHigh, mask)) {
            fd < 32 ? dstExceptLow = dstExceptLow | mask : dstExceptHigh = dstExceptHigh | mask;
            total++;
          }
        }
        if (readfds) {
          HEAP32[readfds >> 2] = dstReadLow;
          HEAP32[readfds + 4 >> 2] = dstReadHigh;
        }
        if (writefds) {
          HEAP32[writefds >> 2] = dstWriteLow;
          HEAP32[writefds + 4 >> 2] = dstWriteHigh;
        }
        if (exceptfds) {
          HEAP32[exceptfds >> 2] = dstExceptLow;
          HEAP32[exceptfds + 4 >> 2] = dstExceptHigh;
        }
        return total;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }, "___syscall__newselect");
    ___syscall__newselect.sig = "iipppp";
    var SOCKFS = { websocketArgs: {}, callbacks: {}, on(event, callback) {
      SOCKFS.callbacks[event] = callback;
    }, emit(event, param) {
      SOCKFS.callbacks[event]?.(param);
    }, mount(mount) {
      SOCKFS.websocketArgs = Module["websocket"] || {};
      (Module["websocket"] ??= {})["on"] = SOCKFS.on;
      return FS.createNode(null, "/", 16895, 0);
    }, createSocket(family, type, protocol) {
      type &= ~526336;
      var streaming = type == 1;
      if (streaming && protocol && protocol != 6) {
        throw new FS.ErrnoError(66);
      }
      var sock = { family, type, protocol, server: null, error: null, peers: {}, pending: [], recv_queue: [], sock_ops: SOCKFS.websocket_sock_ops };
      var name2 = SOCKFS.nextname();
      var node = FS.createNode(SOCKFS.root, name2, 49152, 0);
      node.sock = sock;
      var stream = FS.createStream({ path: name2, node, flags: 2, seekable: false, stream_ops: SOCKFS.stream_ops });
      sock.stream = stream;
      return sock;
    }, getSocket(fd) {
      var stream = FS.getStream(fd);
      if (!stream || !FS.isSocket(stream.node.mode)) {
        return null;
      }
      return stream.node.sock;
    }, stream_ops: { poll(stream) {
      var sock = stream.node.sock;
      return sock.sock_ops.poll(sock);
    }, ioctl(stream, request, varargs) {
      var sock = stream.node.sock;
      return sock.sock_ops.ioctl(sock, request, varargs);
    }, read(stream, buffer, offset, length, position) {
      var sock = stream.node.sock;
      var msg = sock.sock_ops.recvmsg(sock, length);
      if (!msg) {
        return 0;
      }
      buffer.set(msg.buffer, offset);
      return msg.buffer.length;
    }, write(stream, buffer, offset, length, position) {
      var sock = stream.node.sock;
      return sock.sock_ops.sendmsg(sock, buffer, offset, length);
    }, close(stream) {
      var sock = stream.node.sock;
      sock.sock_ops.close(sock);
    } }, nextname() {
      if (!SOCKFS.nextname.current) {
        SOCKFS.nextname.current = 0;
      }
      return `socket[${SOCKFS.nextname.current++}]`;
    }, websocket_sock_ops: { createPeer(sock, addr2, port) {
      var ws;
      if (typeof addr2 == "object") {
        ws = addr2;
        addr2 = null;
        port = null;
      }
      if (ws) {
        if (ws._socket) {
          addr2 = ws._socket.remoteAddress;
          port = ws._socket.remotePort;
        } else {
          var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
          if (!result) {
            throw new Error("WebSocket URL must be in the format ws(s)://address:port");
          }
          addr2 = result[1];
          port = parseInt(result[2], 10);
        }
      } else {
        try {
          var url = "ws:#".replace("#", "//");
          var subProtocols = "binary";
          var opts = void 0;
          if (SOCKFS.websocketArgs["url"]) {
            url = SOCKFS.websocketArgs["url"];
          }
          if (SOCKFS.websocketArgs["subprotocol"]) {
            subProtocols = SOCKFS.websocketArgs["subprotocol"];
          } else if (SOCKFS.websocketArgs["subprotocol"] === null) {
            subProtocols = "null";
          }
          if (url === "ws://" || url === "wss://") {
            var parts2 = addr2.split("/");
            url = url + parts2[0] + ":" + port + "/" + parts2.slice(1).join("/");
          }
          if (subProtocols !== "null") {
            subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
            opts = subProtocols;
          }
          var WebSocketConstructor;
          if (ENVIRONMENT_IS_NODE) {
            WebSocketConstructor = require("ws");
          } else {
            WebSocketConstructor = WebSocket;
          }
          ws = new WebSocketConstructor(url, opts);
          ws.binaryType = "arraybuffer";
        } catch (e) {
          throw new FS.ErrnoError(23);
        }
      }
      var peer = { addr: addr2, port, socket: ws, msg_send_queue: [] };
      SOCKFS.websocket_sock_ops.addPeer(sock, peer);
      SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
      if (sock.type === 2 && typeof sock.sport != "undefined") {
        peer.msg_send_queue.push(new Uint8Array([255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255]));
      }
      return peer;
    }, getPeer(sock, addr2, port) {
      return sock.peers[addr2 + ":" + port];
    }, addPeer(sock, peer) {
      sock.peers[peer.addr + ":" + peer.port] = peer;
    }, removePeer(sock, peer) {
      delete sock.peers[peer.addr + ":" + peer.port];
    }, handlePeerEvents(sock, peer) {
      var first = true;
      var handleOpen = /* @__PURE__ */ __name(function() {
        sock.connecting = false;
        SOCKFS.emit("open", sock.stream.fd);
        try {
          var queued = peer.msg_send_queue.shift();
          while (queued) {
            peer.socket.send(queued);
            queued = peer.msg_send_queue.shift();
          }
        } catch (e) {
          peer.socket.close();
        }
      }, "handleOpen");
      function handleMessage(data) {
        if (typeof data == "string") {
          var encoder = new TextEncoder();
          data = encoder.encode(data);
        } else {
          assert(data.byteLength !== void 0);
          if (data.byteLength == 0) {
            return;
          }
          data = new Uint8Array(data);
        }
        var wasfirst = first;
        first = false;
        if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
          var newport = data[8] << 8 | data[9];
          SOCKFS.websocket_sock_ops.removePeer(sock, peer);
          peer.port = newport;
          SOCKFS.websocket_sock_ops.addPeer(sock, peer);
          return;
        }
        sock.recv_queue.push({ addr: peer.addr, port: peer.port, data });
        SOCKFS.emit("message", sock.stream.fd);
      }
      __name(handleMessage, "handleMessage");
      if (ENVIRONMENT_IS_NODE) {
        peer.socket.on("open", handleOpen);
        peer.socket.on("message", function(data, isBinary) {
          if (!isBinary) {
            return;
          }
          handleMessage(new Uint8Array(data).buffer);
        });
        peer.socket.on("close", function() {
          SOCKFS.emit("close", sock.stream.fd);
        });
        peer.socket.on("error", function(error3) {
          sock.error = 14;
          SOCKFS.emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"]);
        });
      } else {
        peer.socket.onopen = handleOpen;
        peer.socket.onclose = function() {
          SOCKFS.emit("close", sock.stream.fd);
        };
        peer.socket.onmessage = /* @__PURE__ */ __name(function peer_socket_onmessage(event) {
          handleMessage(event.data);
        }, "peer_socket_onmessage");
        peer.socket.onerror = function(error3) {
          sock.error = 14;
          SOCKFS.emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"]);
        };
      }
    }, poll(sock) {
      if (sock.type === 1 && sock.server) {
        return sock.pending.length ? 64 | 1 : 0;
      }
      var mask = 0;
      var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
      if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
        mask |= 64 | 1;
      }
      if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
        mask |= 4;
      }
      if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
        if (sock.connecting) {
          mask |= 4;
        } else {
          mask |= 16;
        }
      }
      return mask;
    }, ioctl(sock, request, arg) {
      switch (request) {
        case 21531:
          var bytes = 0;
          if (sock.recv_queue.length) {
            bytes = sock.recv_queue[0].data.length;
          }
          HEAP32[arg >> 2] = bytes;
          return 0;
        default:
          return 28;
      }
    }, close(sock) {
      if (sock.server) {
        try {
          sock.server.close();
        } catch (e) {
        }
        sock.server = null;
      }
      var peers = Object.keys(sock.peers);
      for (var i2 = 0; i2 < peers.length; i2++) {
        var peer = sock.peers[peers[i2]];
        try {
          peer.socket.close();
        } catch (e) {
        }
        SOCKFS.websocket_sock_ops.removePeer(sock, peer);
      }
      return 0;
    }, bind(sock, addr2, port) {
      if (typeof sock.saddr != "undefined" || typeof sock.sport != "undefined") {
        throw new FS.ErrnoError(28);
      }
      sock.saddr = addr2;
      sock.sport = port;
      if (sock.type === 2) {
        if (sock.server) {
          sock.server.close();
          sock.server = null;
        }
        try {
          sock.sock_ops.listen(sock, 0);
        } catch (e) {
          if (!(e.name === "ErrnoError"))
            throw e;
          if (e.errno !== 138)
            throw e;
        }
      }
    }, connect(sock, addr2, port) {
      if (sock.server) {
        throw new FS.ErrnoError(138);
      }
      if (typeof sock.daddr != "undefined" && typeof sock.dport != "undefined") {
        var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
        if (dest) {
          if (dest.socket.readyState === dest.socket.CONNECTING) {
            throw new FS.ErrnoError(7);
          } else {
            throw new FS.ErrnoError(30);
          }
        }
      }
      var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr2, port);
      sock.daddr = peer.addr;
      sock.dport = peer.port;
      sock.connecting = true;
    }, listen(sock, backlog) {
      if (!ENVIRONMENT_IS_NODE) {
        throw new FS.ErrnoError(138);
      }
      if (sock.server) {
        throw new FS.ErrnoError(28);
      }
      var WebSocketServer = require("ws").Server;
      var host = sock.saddr;
      sock.server = new WebSocketServer({ host, port: sock.sport });
      SOCKFS.emit("listen", sock.stream.fd);
      sock.server.on("connection", function(ws) {
        if (sock.type === 1) {
          var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
          var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
          newsock.daddr = peer.addr;
          newsock.dport = peer.port;
          sock.pending.push(newsock);
          SOCKFS.emit("connection", newsock.stream.fd);
        } else {
          SOCKFS.websocket_sock_ops.createPeer(sock, ws);
          SOCKFS.emit("connection", sock.stream.fd);
        }
      });
      sock.server.on("close", function() {
        SOCKFS.emit("close", sock.stream.fd);
        sock.server = null;
      });
      sock.server.on("error", function(error3) {
        sock.error = 23;
        SOCKFS.emit("error", [sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable"]);
      });
    }, accept(listensock) {
      if (!listensock.server || !listensock.pending.length) {
        throw new FS.ErrnoError(28);
      }
      var newsock = listensock.pending.shift();
      newsock.stream.flags = listensock.stream.flags;
      return newsock;
    }, getname(sock, peer) {
      var addr2, port;
      if (peer) {
        if (sock.daddr === void 0 || sock.dport === void 0) {
          throw new FS.ErrnoError(53);
        }
        addr2 = sock.daddr;
        port = sock.dport;
      } else {
        addr2 = sock.saddr || 0;
        port = sock.sport || 0;
      }
      return { addr: addr2, port };
    }, sendmsg(sock, buffer, offset, length, addr2, port) {
      if (sock.type === 2) {
        if (addr2 === void 0 || port === void 0) {
          addr2 = sock.daddr;
          port = sock.dport;
        }
        if (addr2 === void 0 || port === void 0) {
          throw new FS.ErrnoError(17);
        }
      } else {
        addr2 = sock.daddr;
        port = sock.dport;
      }
      var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr2, port);
      if (sock.type === 1) {
        if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
          throw new FS.ErrnoError(53);
        }
      }
      if (ArrayBuffer.isView(buffer)) {
        offset += buffer.byteOffset;
        buffer = buffer.buffer;
      }
      var data = buffer.slice(offset, offset + length);
      if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
        if (sock.type === 2) {
          if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr2, port);
          }
        }
        dest.msg_send_queue.push(data);
        return length;
      }
      try {
        dest.socket.send(data);
        return length;
      } catch (e) {
        throw new FS.ErrnoError(28);
      }
    }, recvmsg(sock, length) {
      if (sock.type === 1 && sock.server) {
        throw new FS.ErrnoError(53);
      }
      var queued = sock.recv_queue.shift();
      if (!queued) {
        if (sock.type === 1) {
          var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
          if (!dest) {
            throw new FS.ErrnoError(53);
          }
          if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
            return null;
          }
          throw new FS.ErrnoError(6);
        }
        throw new FS.ErrnoError(6);
      }
      var queuedLength = queued.data.byteLength || queued.data.length;
      var queuedOffset = queued.data.byteOffset || 0;
      var queuedBuffer = queued.data.buffer || queued.data;
      var bytesRead = Math.min(length, queuedLength);
      var res = { buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead), addr: queued.addr, port: queued.port };
      if (sock.type === 1 && bytesRead < queuedLength) {
        var bytesRemaining = queuedLength - bytesRead;
        queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
        sock.recv_queue.unshift(queued);
      }
      return res;
    } } };
    var getSocketFromFD = /* @__PURE__ */ __name((fd) => {
      var socket = SOCKFS.getSocket(fd);
      if (!socket)
        throw new FS.ErrnoError(8);
      return socket;
    }, "getSocketFromFD");
    var inetNtop4 = /* @__PURE__ */ __name((addr2) => (addr2 & 255) + "." + (addr2 >> 8 & 255) + "." + (addr2 >> 16 & 255) + "." + (addr2 >> 24 & 255), "inetNtop4");
    var inetNtop6 = /* @__PURE__ */ __name((ints) => {
      var str = "";
      var word = 0;
      var longest = 0;
      var lastzero = 0;
      var zstart = 0;
      var len = 0;
      var i2 = 0;
      var parts2 = [ints[0] & 65535, ints[0] >> 16, ints[1] & 65535, ints[1] >> 16, ints[2] & 65535, ints[2] >> 16, ints[3] & 65535, ints[3] >> 16];
      var hasipv4 = true;
      var v4part = "";
      for (i2 = 0; i2 < 5; i2++) {
        if (parts2[i2] !== 0) {
          hasipv4 = false;
          break;
        }
      }
      if (hasipv4) {
        v4part = inetNtop4(parts2[6] | parts2[7] << 16);
        if (parts2[5] === -1) {
          str = "::ffff:";
          str += v4part;
          return str;
        }
        if (parts2[5] === 0) {
          str = "::";
          if (v4part === "0.0.0.0")
            v4part = "";
          if (v4part === "0.0.0.1")
            v4part = "1";
          str += v4part;
          return str;
        }
      }
      for (word = 0; word < 8; word++) {
        if (parts2[word] === 0) {
          if (word - lastzero > 1) {
            len = 0;
          }
          lastzero = word;
          len++;
        }
        if (len > longest) {
          longest = len;
          zstart = word - longest + 1;
        }
      }
      for (word = 0; word < 8; word++) {
        if (longest > 1) {
          if (parts2[word] === 0 && word >= zstart && word < zstart + longest) {
            if (word === zstart) {
              str += ":";
              if (zstart === 0)
                str += ":";
            }
            continue;
          }
        }
        str += Number(_ntohs(parts2[word] & 65535)).toString(16);
        str += word < 7 ? ":" : "";
      }
      return str;
    }, "inetNtop6");
    var readSockaddr = /* @__PURE__ */ __name((sa, salen) => {
      var family = HEAP16[sa >> 1];
      var port = _ntohs(HEAPU16[sa + 2 >> 1]);
      var addr2;
      switch (family) {
        case 2:
          if (salen !== 16) {
            return { errno: 28 };
          }
          addr2 = HEAP32[sa + 4 >> 2];
          addr2 = inetNtop4(addr2);
          break;
        case 10:
          if (salen !== 28) {
            return { errno: 28 };
          }
          addr2 = [HEAP32[sa + 8 >> 2], HEAP32[sa + 12 >> 2], HEAP32[sa + 16 >> 2], HEAP32[sa + 20 >> 2]];
          addr2 = inetNtop6(addr2);
          break;
        default:
          return { errno: 5 };
      }
      return { family, addr: addr2, port };
    }, "readSockaddr");
    var inetPton4 = /* @__PURE__ */ __name((str) => {
      var b3 = str.split(".");
      for (var i2 = 0; i2 < 4; i2++) {
        var tmp = Number(b3[i2]);
        if (isNaN(tmp))
          return null;
        b3[i2] = tmp;
      }
      return (b3[0] | b3[1] << 8 | b3[2] << 16 | b3[3] << 24) >>> 0;
    }, "inetPton4");
    var jstoi_q = /* @__PURE__ */ __name((str) => parseInt(str), "jstoi_q");
    var inetPton6 = /* @__PURE__ */ __name((str) => {
      var words;
      var w2, offset, z;
      var valid6regx = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;
      var parts2 = [];
      if (!valid6regx.test(str)) {
        return null;
      }
      if (str === "::") {
        return [0, 0, 0, 0, 0, 0, 0, 0];
      }
      if (str.startsWith("::")) {
        str = str.replace("::", "Z:");
      } else {
        str = str.replace("::", ":Z:");
      }
      if (str.indexOf(".") > 0) {
        str = str.replace(new RegExp("[.]", "g"), ":");
        words = str.split(":");
        words[words.length - 4] = jstoi_q(words[words.length - 4]) + jstoi_q(words[words.length - 3]) * 256;
        words[words.length - 3] = jstoi_q(words[words.length - 2]) + jstoi_q(words[words.length - 1]) * 256;
        words = words.slice(0, words.length - 2);
      } else {
        words = str.split(":");
      }
      offset = 0;
      z = 0;
      for (w2 = 0; w2 < words.length; w2++) {
        if (typeof words[w2] == "string") {
          if (words[w2] === "Z") {
            for (z = 0; z < 8 - words.length + 1; z++) {
              parts2[w2 + z] = 0;
            }
            offset = z - 1;
          } else {
            parts2[w2 + offset] = _htons(parseInt(words[w2], 16));
          }
        } else {
          parts2[w2 + offset] = words[w2];
        }
      }
      return [parts2[1] << 16 | parts2[0], parts2[3] << 16 | parts2[2], parts2[5] << 16 | parts2[4], parts2[7] << 16 | parts2[6]];
    }, "inetPton6");
    var DNS = { address_map: { id: 1, addrs: {}, names: {} }, lookup_name(name2) {
      var res = inetPton4(name2);
      if (res !== null) {
        return name2;
      }
      res = inetPton6(name2);
      if (res !== null) {
        return name2;
      }
      var addr2;
      if (DNS.address_map.addrs[name2]) {
        addr2 = DNS.address_map.addrs[name2];
      } else {
        var id = DNS.address_map.id++;
        assert(id < 65535, "exceeded max address mappings of 65535");
        addr2 = "172.29." + (id & 255) + "." + (id & 65280);
        DNS.address_map.names[addr2] = name2;
        DNS.address_map.addrs[name2] = addr2;
      }
      return addr2;
    }, lookup_addr(addr2) {
      if (DNS.address_map.names[addr2]) {
        return DNS.address_map.names[addr2];
      }
      return null;
    } };
    var getSocketAddress = /* @__PURE__ */ __name((addrp, addrlen) => {
      var info4 = readSockaddr(addrp, addrlen);
      if (info4.errno)
        throw new FS.ErrnoError(info4.errno);
      info4.addr = DNS.lookup_addr(info4.addr) || info4.addr;
      return info4;
    }, "getSocketAddress");
    function ___syscall_bind(fd, addr2, addrlen, d1, d22, d3) {
      try {
        var sock = getSocketFromFD(fd);
        var info4 = getSocketAddress(addr2, addrlen);
        sock.sock_ops.bind(sock, info4.addr, info4.port);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_bind, "___syscall_bind");
    ___syscall_bind.sig = "iippiii";
    function ___syscall_chdir(path) {
      try {
        path = SYSCALLS.getStr(path);
        FS.chdir(path);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_chdir, "___syscall_chdir");
    ___syscall_chdir.sig = "ip";
    function ___syscall_chmod(path, mode) {
      try {
        path = SYSCALLS.getStr(path);
        FS.chmod(path, mode);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_chmod, "___syscall_chmod");
    ___syscall_chmod.sig = "ipi";
    function ___syscall_dup(fd) {
      try {
        var old = SYSCALLS.getStreamFromFD(fd);
        return FS.dupStream(old).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_dup, "___syscall_dup");
    ___syscall_dup.sig = "ii";
    function ___syscall_dup3(fd, newfd, flags2) {
      try {
        var old = SYSCALLS.getStreamFromFD(fd);
        if (old.fd === newfd)
          return -28;
        if (newfd < 0 || newfd >= FS.MAX_OPEN_FDS)
          return -8;
        var existing = FS.getStream(newfd);
        if (existing)
          FS.close(existing);
        return FS.dupStream(old, newfd).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_dup3, "___syscall_dup3");
    ___syscall_dup3.sig = "iiii";
    function ___syscall_faccessat(dirfd, path, amode, flags2) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (amode & ~7) {
          return -28;
        }
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node) {
          return -44;
        }
        var perms = "";
        if (amode & 4)
          perms += "r";
        if (amode & 2)
          perms += "w";
        if (amode & 1)
          perms += "x";
        if (perms && FS.nodePermissions(node, perms)) {
          return -2;
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_faccessat, "___syscall_faccessat");
    ___syscall_faccessat.sig = "iipii";
    var ___syscall_fadvise64 = /* @__PURE__ */ __name((fd, offset, len, advice) => 0, "___syscall_fadvise64");
    ___syscall_fadvise64.sig = "iijji";
    var INT53_MAX = 9007199254740992;
    var INT53_MIN = -9007199254740992;
    var bigintToI53Checked = /* @__PURE__ */ __name((num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num), "bigintToI53Checked");
    function ___syscall_fallocate(fd, mode, offset, len) {
      offset = bigintToI53Checked(offset);
      len = bigintToI53Checked(len);
      try {
        if (isNaN(offset))
          return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.allocate(stream, offset, len);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_fallocate, "___syscall_fallocate");
    ___syscall_fallocate.sig = "iiijj";
    var syscallGetVarargI = /* @__PURE__ */ __name(() => {
      var ret = HEAP32[+SYSCALLS.varargs >> 2];
      SYSCALLS.varargs += 4;
      return ret;
    }, "syscallGetVarargI");
    var syscallGetVarargP = syscallGetVarargI;
    function ___syscall_fcntl64(fd, cmd, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
          case 0: {
            var arg = syscallGetVarargI();
            if (arg < 0) {
              return -28;
            }
            while (FS.streams[arg]) {
              arg++;
            }
            var newStream;
            newStream = FS.dupStream(stream, arg);
            return newStream.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return stream.flags;
          case 4: {
            var arg = syscallGetVarargI();
            stream.flags |= arg;
            return 0;
          }
          case 12: {
            var arg = syscallGetVarargP();
            var offset = 0;
            HEAP16[arg + offset >> 1] = 2;
            return 0;
          }
          case 13:
          case 14:
            return 0;
        }
        return -28;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_fcntl64, "___syscall_fcntl64");
    ___syscall_fcntl64.sig = "iiip";
    function ___syscall_fdatasync(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_fdatasync, "___syscall_fdatasync");
    ___syscall_fdatasync.sig = "ii";
    function ___syscall_fstat64(fd, buf) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        return SYSCALLS.doStat(FS.stat, stream.path, buf);
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_fstat64, "___syscall_fstat64");
    ___syscall_fstat64.sig = "iip";
    function ___syscall_ftruncate64(fd, length) {
      length = bigintToI53Checked(length);
      try {
        if (isNaN(length))
          return 61;
        FS.ftruncate(fd, length);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_ftruncate64, "___syscall_ftruncate64");
    ___syscall_ftruncate64.sig = "iij";
    var stringToUTF8 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite), "stringToUTF8");
    function ___syscall_getcwd(buf, size) {
      try {
        if (size === 0)
          return -28;
        var cwd2 = FS.cwd();
        var cwdLengthInBytes = lengthBytesUTF8(cwd2) + 1;
        if (size < cwdLengthInBytes)
          return -68;
        stringToUTF8(cwd2, buf, size);
        return cwdLengthInBytes;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_getcwd, "___syscall_getcwd");
    ___syscall_getcwd.sig = "ipp";
    function ___syscall_getdents64(fd, dirp, count3) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        stream.getdents ||= FS.readdir(stream.path);
        var struct_size = 280;
        var pos = 0;
        var off2 = FS.llseek(stream, 0, 1);
        var startIdx = Math.floor(off2 / struct_size);
        var endIdx = Math.min(stream.getdents.length, startIdx + Math.floor(count3 / struct_size));
        for (var idx = startIdx; idx < endIdx; idx++) {
          var id;
          var type;
          var name2 = stream.getdents[idx];
          if (name2 === ".") {
            id = stream.node.id;
            type = 4;
          } else if (name2 === "..") {
            var lookup = FS.lookupPath(stream.path, { parent: true });
            id = lookup.node.id;
            type = 4;
          } else {
            var child;
            try {
              child = FS.lookupNode(stream.node, name2);
            } catch (e) {
              if (e?.errno === 28) {
                continue;
              }
              throw e;
            }
            id = child.id;
            type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
          }
          HEAP64[dirp + pos >> 3] = BigInt(id);
          HEAP64[dirp + pos + 8 >> 3] = BigInt((idx + 1) * struct_size);
          HEAP16[dirp + pos + 16 >> 1] = 280;
          HEAP8[dirp + pos + 18] = type;
          stringToUTF8(name2, dirp + pos + 19, 256);
          pos += struct_size;
        }
        FS.llseek(stream, idx * struct_size, 0);
        return pos;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_getdents64, "___syscall_getdents64");
    ___syscall_getdents64.sig = "iipp";
    function ___syscall_ioctl(fd, op, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
          case 21509: {
            if (!stream.tty)
              return -59;
            return 0;
          }
          case 21505: {
            if (!stream.tty)
              return -59;
            if (stream.tty.ops.ioctl_tcgets) {
              var termios = stream.tty.ops.ioctl_tcgets(stream);
              var argp = syscallGetVarargP();
              HEAP32[argp >> 2] = termios.c_iflag || 0;
              HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
              HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
              HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
              for (var i2 = 0; i2 < 32; i2++) {
                HEAP8[argp + i2 + 17] = termios.c_cc[i2] || 0;
              }
              return 0;
            }
            return 0;
          }
          case 21510:
          case 21511:
          case 21512: {
            if (!stream.tty)
              return -59;
            return 0;
          }
          case 21506:
          case 21507:
          case 21508: {
            if (!stream.tty)
              return -59;
            if (stream.tty.ops.ioctl_tcsets) {
              var argp = syscallGetVarargP();
              var c_iflag = HEAP32[argp >> 2];
              var c_oflag = HEAP32[argp + 4 >> 2];
              var c_cflag = HEAP32[argp + 8 >> 2];
              var c_lflag = HEAP32[argp + 12 >> 2];
              var c_cc = [];
              for (var i2 = 0; i2 < 32; i2++) {
                c_cc.push(HEAP8[argp + i2 + 17]);
              }
              return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
            }
            return 0;
          }
          case 21519: {
            if (!stream.tty)
              return -59;
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = 0;
            return 0;
          }
          case 21520: {
            if (!stream.tty)
              return -59;
            return -28;
          }
          case 21531: {
            var argp = syscallGetVarargP();
            return FS.ioctl(stream, op, argp);
          }
          case 21523: {
            if (!stream.tty)
              return -59;
            if (stream.tty.ops.ioctl_tiocgwinsz) {
              var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
              var argp = syscallGetVarargP();
              HEAP16[argp >> 1] = winsize[0];
              HEAP16[argp + 2 >> 1] = winsize[1];
            }
            return 0;
          }
          case 21524: {
            if (!stream.tty)
              return -59;
            return 0;
          }
          case 21515: {
            if (!stream.tty)
              return -59;
            return 0;
          }
          default:
            return -28;
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_ioctl, "___syscall_ioctl");
    ___syscall_ioctl.sig = "iiip";
    function ___syscall_lstat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.doStat(FS.lstat, path, buf);
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_lstat64, "___syscall_lstat64");
    ___syscall_lstat64.sig = "ipp";
    function ___syscall_mkdirat(dirfd, path, mode) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        FS.mkdir(path, mode, 0);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_mkdirat, "___syscall_mkdirat");
    ___syscall_mkdirat.sig = "iipi";
    function ___syscall_newfstatat(dirfd, path, buf, flags2) {
      try {
        path = SYSCALLS.getStr(path);
        var nofollow = flags2 & 256;
        var allowEmpty = flags2 & 4096;
        flags2 = flags2 & ~6400;
        path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
        return SYSCALLS.doStat(nofollow ? FS.lstat : FS.stat, path, buf);
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_newfstatat, "___syscall_newfstatat");
    ___syscall_newfstatat.sig = "iippi";
    function ___syscall_openat(dirfd, path, flags2, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? syscallGetVarargI() : 0;
        return FS.open(path, flags2, mode).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_openat, "___syscall_openat");
    ___syscall_openat.sig = "iipip";
    var PIPEFS = { BUCKET_BUFFER_SIZE: 8192, mount(mount) {
      return FS.createNode(null, "/", 16384 | 511, 0);
    }, createPipe() {
      var pipe = { buckets: [], refcnt: 2 };
      pipe.buckets.push({ buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE), offset: 0, roffset: 0 });
      var rName = PIPEFS.nextname();
      var wName = PIPEFS.nextname();
      var rNode = FS.createNode(PIPEFS.root, rName, 4096, 0);
      var wNode = FS.createNode(PIPEFS.root, wName, 4096, 0);
      rNode.pipe = pipe;
      wNode.pipe = pipe;
      var readableStream = FS.createStream({ path: rName, node: rNode, flags: 0, seekable: false, stream_ops: PIPEFS.stream_ops });
      rNode.stream = readableStream;
      var writableStream = FS.createStream({ path: wName, node: wNode, flags: 1, seekable: false, stream_ops: PIPEFS.stream_ops });
      wNode.stream = writableStream;
      return { readable_fd: readableStream.fd, writable_fd: writableStream.fd };
    }, stream_ops: { poll(stream) {
      var pipe = stream.node.pipe;
      if ((stream.flags & 2097155) === 1) {
        return 256 | 4;
      }
      if (pipe.buckets.length > 0) {
        for (var i2 = 0; i2 < pipe.buckets.length; i2++) {
          var bucket = pipe.buckets[i2];
          if (bucket.offset - bucket.roffset > 0) {
            return 64 | 1;
          }
        }
      }
      return 0;
    }, ioctl(stream, request, varargs) {
      return 28;
    }, fsync(stream) {
      return 28;
    }, read(stream, buffer, offset, length, position) {
      var pipe = stream.node.pipe;
      var currentLength = 0;
      for (var i2 = 0; i2 < pipe.buckets.length; i2++) {
        var bucket = pipe.buckets[i2];
        currentLength += bucket.offset - bucket.roffset;
      }
      var data = buffer.subarray(offset, offset + length);
      if (length <= 0) {
        return 0;
      }
      if (currentLength == 0) {
        throw new FS.ErrnoError(6);
      }
      var toRead = Math.min(currentLength, length);
      var totalRead = toRead;
      var toRemove = 0;
      for (var i2 = 0; i2 < pipe.buckets.length; i2++) {
        var currBucket = pipe.buckets[i2];
        var bucketSize = currBucket.offset - currBucket.roffset;
        if (toRead <= bucketSize) {
          var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
          if (toRead < bucketSize) {
            tmpSlice = tmpSlice.subarray(0, toRead);
            currBucket.roffset += toRead;
          } else {
            toRemove++;
          }
          data.set(tmpSlice);
          break;
        } else {
          var tmpSlice = currBucket.buffer.subarray(currBucket.roffset, currBucket.offset);
          data.set(tmpSlice);
          data = data.subarray(tmpSlice.byteLength);
          toRead -= tmpSlice.byteLength;
          toRemove++;
        }
      }
      if (toRemove && toRemove == pipe.buckets.length) {
        toRemove--;
        pipe.buckets[toRemove].offset = 0;
        pipe.buckets[toRemove].roffset = 0;
      }
      pipe.buckets.splice(0, toRemove);
      return totalRead;
    }, write(stream, buffer, offset, length, position) {
      var pipe = stream.node.pipe;
      var data = buffer.subarray(offset, offset + length);
      var dataLen = data.byteLength;
      if (dataLen <= 0) {
        return 0;
      }
      var currBucket = null;
      if (pipe.buckets.length == 0) {
        currBucket = { buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE), offset: 0, roffset: 0 };
        pipe.buckets.push(currBucket);
      } else {
        currBucket = pipe.buckets[pipe.buckets.length - 1];
      }
      assert(currBucket.offset <= PIPEFS.BUCKET_BUFFER_SIZE);
      var freeBytesInCurrBuffer = PIPEFS.BUCKET_BUFFER_SIZE - currBucket.offset;
      if (freeBytesInCurrBuffer >= dataLen) {
        currBucket.buffer.set(data, currBucket.offset);
        currBucket.offset += dataLen;
        return dataLen;
      } else if (freeBytesInCurrBuffer > 0) {
        currBucket.buffer.set(data.subarray(0, freeBytesInCurrBuffer), currBucket.offset);
        currBucket.offset += freeBytesInCurrBuffer;
        data = data.subarray(freeBytesInCurrBuffer, data.byteLength);
      }
      var numBuckets = data.byteLength / PIPEFS.BUCKET_BUFFER_SIZE | 0;
      var remElements = data.byteLength % PIPEFS.BUCKET_BUFFER_SIZE;
      for (var i2 = 0; i2 < numBuckets; i2++) {
        var newBucket = { buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE), offset: PIPEFS.BUCKET_BUFFER_SIZE, roffset: 0 };
        pipe.buckets.push(newBucket);
        newBucket.buffer.set(data.subarray(0, PIPEFS.BUCKET_BUFFER_SIZE));
        data = data.subarray(PIPEFS.BUCKET_BUFFER_SIZE, data.byteLength);
      }
      if (remElements > 0) {
        var newBucket = { buffer: new Uint8Array(PIPEFS.BUCKET_BUFFER_SIZE), offset: data.byteLength, roffset: 0 };
        pipe.buckets.push(newBucket);
        newBucket.buffer.set(data);
      }
      return dataLen;
    }, close(stream) {
      var pipe = stream.node.pipe;
      pipe.refcnt--;
      if (pipe.refcnt === 0) {
        pipe.buckets = null;
      }
    } }, nextname() {
      if (!PIPEFS.nextname.current) {
        PIPEFS.nextname.current = 0;
      }
      return "pipe[" + PIPEFS.nextname.current++ + "]";
    } };
    function ___syscall_pipe(fdPtr) {
      try {
        if (fdPtr == 0) {
          throw new FS.ErrnoError(21);
        }
        var res = PIPEFS.createPipe();
        HEAP32[fdPtr >> 2] = res.readable_fd;
        HEAP32[fdPtr + 4 >> 2] = res.writable_fd;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_pipe, "___syscall_pipe");
    ___syscall_pipe.sig = "ip";
    function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (bufsize <= 0)
          return -28;
        var ret = FS.readlink(path);
        var len = Math.min(bufsize, lengthBytesUTF8(ret));
        var endChar = HEAP8[buf + len];
        stringToUTF8(ret, buf, bufsize + 1);
        HEAP8[buf + len] = endChar;
        return len;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_readlinkat, "___syscall_readlinkat");
    ___syscall_readlinkat.sig = "iippp";
    var writeSockaddr = /* @__PURE__ */ __name((sa, family, addr2, port, addrlen) => {
      switch (family) {
        case 2:
          addr2 = inetPton4(addr2);
          zeroMemory(sa, 16);
          if (addrlen) {
            HEAP32[addrlen >> 2] = 16;
          }
          HEAP16[sa >> 1] = family;
          HEAP32[sa + 4 >> 2] = addr2;
          HEAP16[sa + 2 >> 1] = _htons(port);
          break;
        case 10:
          addr2 = inetPton6(addr2);
          zeroMemory(sa, 28);
          if (addrlen) {
            HEAP32[addrlen >> 2] = 28;
          }
          HEAP32[sa >> 2] = family;
          HEAP32[sa + 8 >> 2] = addr2[0];
          HEAP32[sa + 12 >> 2] = addr2[1];
          HEAP32[sa + 16 >> 2] = addr2[2];
          HEAP32[sa + 20 >> 2] = addr2[3];
          HEAP16[sa + 2 >> 1] = _htons(port);
          break;
        default:
          return 5;
      }
      return 0;
    }, "writeSockaddr");
    function ___syscall_recvfrom(fd, buf, len, flags2, addr2, addrlen) {
      try {
        var sock = getSocketFromFD(fd);
        var msg = sock.sock_ops.recvmsg(sock, len);
        if (!msg)
          return 0;
        if (addr2) {
          var errno = writeSockaddr(addr2, sock.family, DNS.lookup_name(msg.addr), msg.port, addrlen);
        }
        HEAPU8.set(msg.buffer, buf);
        return msg.buffer.byteLength;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_recvfrom, "___syscall_recvfrom");
    ___syscall_recvfrom.sig = "iippipp";
    function ___syscall_renameat(olddirfd, oldpath, newdirfd, newpath) {
      try {
        oldpath = SYSCALLS.getStr(oldpath);
        newpath = SYSCALLS.getStr(newpath);
        oldpath = SYSCALLS.calculateAt(olddirfd, oldpath);
        newpath = SYSCALLS.calculateAt(newdirfd, newpath);
        FS.rename(oldpath, newpath);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_renameat, "___syscall_renameat");
    ___syscall_renameat.sig = "iipip";
    function ___syscall_rmdir(path) {
      try {
        path = SYSCALLS.getStr(path);
        FS.rmdir(path);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_rmdir, "___syscall_rmdir");
    ___syscall_rmdir.sig = "ip";
    function ___syscall_sendto(fd, message, length, flags2, addr2, addr_len) {
      try {
        var sock = getSocketFromFD(fd);
        if (!addr2) {
          return FS.write(sock.stream, HEAP8, message, length);
        }
        var dest = getSocketAddress(addr2, addr_len);
        return sock.sock_ops.sendmsg(sock, HEAP8, message, length, dest.addr, dest.port);
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_sendto, "___syscall_sendto");
    ___syscall_sendto.sig = "iippipp";
    function ___syscall_socket(domain2, type, protocol) {
      try {
        var sock = SOCKFS.createSocket(domain2, type, protocol);
        return sock.stream.fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_socket, "___syscall_socket");
    ___syscall_socket.sig = "iiiiiii";
    function ___syscall_stat64(path, buf) {
      try {
        path = SYSCALLS.getStr(path);
        return SYSCALLS.doStat(FS.stat, path, buf);
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_stat64, "___syscall_stat64");
    ___syscall_stat64.sig = "ipp";
    function ___syscall_symlinkat(target, dirfd, linkpath) {
      try {
        target = SYSCALLS.getStr(target);
        linkpath = SYSCALLS.getStr(linkpath);
        linkpath = SYSCALLS.calculateAt(dirfd, linkpath);
        FS.symlink(target, linkpath);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_symlinkat, "___syscall_symlinkat");
    ___syscall_symlinkat.sig = "ipip";
    function ___syscall_truncate64(path, length) {
      length = bigintToI53Checked(length);
      try {
        if (isNaN(length))
          return 61;
        path = SYSCALLS.getStr(path);
        FS.truncate(path, length);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_truncate64, "___syscall_truncate64");
    ___syscall_truncate64.sig = "ipj";
    function ___syscall_unlinkat(dirfd, path, flags2) {
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        if (flags2 === 0) {
          FS.unlink(path);
        } else if (flags2 === 512) {
          FS.rmdir(path);
        } else {
          abort("Invalid flags passed to unlinkat");
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(___syscall_unlinkat, "___syscall_unlinkat");
    ___syscall_unlinkat.sig = "iipi";
    var ___table_base = new WebAssembly.Global({ value: "i32", mutable: false }, 1);
    Module["___table_base"] = ___table_base;
    var __abort_js = /* @__PURE__ */ __name(() => abort(""), "__abort_js");
    __abort_js.sig = "v";
    var ENV = {};
    var stackAlloc = /* @__PURE__ */ __name((sz) => __emscripten_stack_alloc(sz), "stackAlloc");
    var stringToUTF8OnStack = /* @__PURE__ */ __name((str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    }, "stringToUTF8OnStack");
    var dlSetError = /* @__PURE__ */ __name((msg) => {
      var sp = stackSave();
      var cmsg = stringToUTF8OnStack(msg);
      ___dl_seterr(cmsg, 0);
      stackRestore(sp);
    }, "dlSetError");
    var dlopenInternal = /* @__PURE__ */ __name((handle2, jsflags) => {
      var filename = UTF8ToString(handle2 + 36);
      var flags2 = HEAP32[handle2 + 4 >> 2];
      filename = PATH.normalize(filename);
      var global = Boolean(flags2 & 256);
      var localScope2 = global ? null : {};
      var combinedFlags = { global, nodelete: Boolean(flags2 & 4096), loadAsync: jsflags.loadAsync };
      if (jsflags.loadAsync) {
        return loadDynamicLibrary(filename, combinedFlags, localScope2, handle2);
      }
      try {
        return loadDynamicLibrary(filename, combinedFlags, localScope2, handle2);
      } catch (e) {
        dlSetError(`Could not load dynamic lib: ${filename}
${e}`);
        return 0;
      }
    }, "dlopenInternal");
    var __dlopen_js = /* @__PURE__ */ __name((handle2) => dlopenInternal(handle2, { loadAsync: false }), "__dlopen_js");
    __dlopen_js.sig = "pp";
    var __dlsym_js = /* @__PURE__ */ __name((handle2, symbol, symbolIndex) => {
      symbol = UTF8ToString(symbol);
      var result;
      var newSymIndex;
      var lib = LDSO.loadedLibsByHandle[handle2];
      if (!lib.exports.hasOwnProperty(symbol) || lib.exports[symbol].stub) {
        dlSetError(`Tried to lookup unknown symbol "${symbol}" in dynamic lib: ${lib.name}`);
        return 0;
      }
      newSymIndex = Object.keys(lib.exports).indexOf(symbol);
      result = lib.exports[symbol];
      if (typeof result == "function") {
        var addr2 = getFunctionAddress(result);
        if (addr2) {
          result = addr2;
        } else {
          result = addFunction(result, result.sig);
          HEAPU32[symbolIndex >> 2] = newSymIndex;
        }
      }
      return result;
    }, "__dlsym_js");
    __dlsym_js.sig = "pppp";
    var runtimeKeepaliveCounter = 0;
    var __emscripten_runtime_keepalive_clear = /* @__PURE__ */ __name(() => {
      noExitRuntime = false;
      runtimeKeepaliveCounter = 0;
    }, "__emscripten_runtime_keepalive_clear");
    __emscripten_runtime_keepalive_clear.sig = "v";
    var __emscripten_system = /* @__PURE__ */ __name((command) => {
      if (ENVIRONMENT_IS_NODE) {
        if (!command)
          return 1;
        var cmdstr = UTF8ToString(command);
        if (!cmdstr.length)
          return 0;
        var cp = require("child_process");
        var ret = cp.spawnSync(cmdstr, [], { shell: true, stdio: "inherit" });
        var _W_EXITCODE = /* @__PURE__ */ __name((ret2, sig) => ret2 << 8 | sig, "_W_EXITCODE");
        if (ret.status === null) {
          var signalToNumber = /* @__PURE__ */ __name((sig) => {
            switch (sig) {
              case "SIGHUP":
                return 1;
              case "SIGQUIT":
                return 3;
              case "SIGFPE":
                return 8;
              case "SIGKILL":
                return 9;
              case "SIGALRM":
                return 14;
              case "SIGTERM":
                return 15;
              default:
                return 2;
            }
          }, "signalToNumber");
          return _W_EXITCODE(0, signalToNumber(ret.signal));
        }
        return _W_EXITCODE(ret.status, 0);
      }
      if (!command)
        return 0;
      return -52;
    }, "__emscripten_system");
    __emscripten_system.sig = "ip";
    var __emscripten_throw_longjmp = /* @__PURE__ */ __name(() => {
      throw Infinity;
    }, "__emscripten_throw_longjmp");
    __emscripten_throw_longjmp.sig = "v";
    function __gmtime_js(time3, tmPtr) {
      time3 = bigintToI53Checked(time3);
      var date = new Date(time3 * 1e3);
      HEAP32[tmPtr >> 2] = date.getUTCSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getUTCMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getUTCHours();
      HEAP32[tmPtr + 12 >> 2] = date.getUTCDate();
      HEAP32[tmPtr + 16 >> 2] = date.getUTCMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getUTCFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getUTCDay();
      var start2 = Date.UTC(date.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
      var yday = (date.getTime() - start2) / (1e3 * 60 * 60 * 24) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
    }
    __name(__gmtime_js, "__gmtime_js");
    __gmtime_js.sig = "vjp";
    var isLeapYear = /* @__PURE__ */ __name((year) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0), "isLeapYear");
    var MONTH_DAYS_LEAP_CUMULATIVE = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
    var MONTH_DAYS_REGULAR_CUMULATIVE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var ydayFromDate = /* @__PURE__ */ __name((date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE;
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1;
      return yday;
    }, "ydayFromDate");
    function __localtime_js(time3, tmPtr) {
      time3 = bigintToI53Checked(time3);
      var date = new Date(time3 * 1e3);
      HEAP32[tmPtr >> 2] = date.getSeconds();
      HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
      HEAP32[tmPtr + 8 >> 2] = date.getHours();
      HEAP32[tmPtr + 12 >> 2] = date.getDate();
      HEAP32[tmPtr + 16 >> 2] = date.getMonth();
      HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
      HEAP32[tmPtr + 24 >> 2] = date.getDay();
      var yday = ydayFromDate(date) | 0;
      HEAP32[tmPtr + 28 >> 2] = yday;
      HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
      var start2 = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start2.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset)) | 0;
      HEAP32[tmPtr + 32 >> 2] = dst;
    }
    __name(__localtime_js, "__localtime_js");
    __localtime_js.sig = "vjp";
    function __mmap_js(len, prot, flags2, fd, offset, allocated, addr2) {
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset))
          return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        var res = FS.mmap(stream, len, offset, prot, flags2);
        var ptr = res.ptr;
        HEAP32[allocated >> 2] = res.allocated;
        HEAPU32[addr2 >> 2] = ptr;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(__mmap_js, "__mmap_js");
    __mmap_js.sig = "ipiiijpp";
    function __munmap_js(addr2, len, prot, flags2, fd, offset) {
      offset = bigintToI53Checked(offset);
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        if (prot & 2) {
          SYSCALLS.doMsync(addr2, stream, len, flags2, offset);
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return -e.errno;
      }
    }
    __name(__munmap_js, "__munmap_js");
    __munmap_js.sig = "ippiiij";
    var timers = {};
    var handleException = /* @__PURE__ */ __name((e) => {
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS;
      }
      quit_(1, e);
    }, "handleException");
    var keepRuntimeAlive = /* @__PURE__ */ __name(() => noExitRuntime || runtimeKeepaliveCounter > 0, "keepRuntimeAlive");
    var _proc_exit = /* @__PURE__ */ __name((code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module["onExit"]?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    }, "_proc_exit");
    _proc_exit.sig = "vi";
    var exitJS = /* @__PURE__ */ __name((status, implicit) => {
      EXITSTATUS = status;
      _proc_exit(status);
    }, "exitJS");
    var _exit = exitJS;
    _exit.sig = "vi";
    var maybeExit = /* @__PURE__ */ __name(() => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    }, "maybeExit");
    var callUserCallback = /* @__PURE__ */ __name((func2) => {
      if (ABORT) {
        return;
      }
      try {
        func2();
        maybeExit();
      } catch (e) {
        handleException(e);
      }
    }, "callUserCallback");
    var _emscripten_get_now = /* @__PURE__ */ __name(() => performance.now(), "_emscripten_get_now");
    _emscripten_get_now.sig = "d";
    var __setitimer_js = /* @__PURE__ */ __name((which, timeout_ms) => {
      if (timers[which]) {
        clearTimeout(timers[which].id);
        delete timers[which];
      }
      if (!timeout_ms)
        return 0;
      var id = setTimeout(() => {
        delete timers[which];
        callUserCallback(() => __emscripten_timeout(which, _emscripten_get_now()));
      }, timeout_ms);
      timers[which] = { id, timeout_ms };
      return 0;
    }, "__setitimer_js");
    __setitimer_js.sig = "iid";
    var __tzset_js = /* @__PURE__ */ __name((timezone, daylight, std_name, dst_name) => {
      var currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
      HEAPU32[timezone >> 2] = stdTimezoneOffset * 60;
      HEAP32[daylight >> 2] = Number(winterOffset != summerOffset);
      var extractZone = /* @__PURE__ */ __name((timezoneOffset) => {
        var sign = timezoneOffset >= 0 ? "-" : "+";
        var absOffset = Math.abs(timezoneOffset);
        var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        var minutes = String(absOffset % 60).padStart(2, "0");
        return `UTC${sign}${hours}${minutes}`;
      }, "extractZone");
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      if (summerOffset < winterOffset) {
        stringToUTF8(winterName, std_name, 17);
        stringToUTF8(summerName, dst_name, 17);
      } else {
        stringToUTF8(winterName, dst_name, 17);
        stringToUTF8(summerName, std_name, 17);
      }
    }, "__tzset_js");
    __tzset_js.sig = "vpppp";
    var _emscripten_date_now = /* @__PURE__ */ __name(() => Date.now(), "_emscripten_date_now");
    _emscripten_date_now.sig = "d";
    var nowIsMonotonic = 1;
    var checkWasiClock = /* @__PURE__ */ __name((clock_id) => clock_id >= 0 && clock_id <= 3, "checkWasiClock");
    function _clock_time_get(clk_id, ignored_precision, ptime) {
      ignored_precision = bigintToI53Checked(ignored_precision);
      if (!checkWasiClock(clk_id)) {
        return 28;
      }
      var now;
      if (clk_id === 0) {
        now = _emscripten_date_now();
      } else if (nowIsMonotonic) {
        now = _emscripten_get_now();
      } else {
        return 52;
      }
      var nsec = Math.round(now * 1e3 * 1e3);
      HEAP64[ptime >> 3] = BigInt(nsec);
      return 0;
    }
    __name(_clock_time_get, "_clock_time_get");
    _clock_time_get.sig = "iijp";
    var readEmAsmArgsArray = [];
    var readEmAsmArgs = /* @__PURE__ */ __name((sigPtr, buf) => {
      readEmAsmArgsArray.length = 0;
      var ch;
      while (ch = HEAPU8[sigPtr++]) {
        var wide = ch != 105;
        wide &= ch != 112;
        buf += wide && buf % 8 ? 4 : 0;
        readEmAsmArgsArray.push(ch == 112 ? HEAPU32[buf >> 2] : ch == 106 ? HEAP64[buf >> 3] : ch == 105 ? HEAP32[buf >> 2] : HEAPF64[buf >> 3]);
        buf += wide ? 8 : 4;
      }
      return readEmAsmArgsArray;
    }, "readEmAsmArgs");
    var runEmAsmFunction = /* @__PURE__ */ __name((code, sigPtr, argbuf) => {
      var args2 = readEmAsmArgs(sigPtr, argbuf);
      return ASM_CONSTS[code](...args2);
    }, "runEmAsmFunction");
    var _emscripten_asm_const_int = /* @__PURE__ */ __name((code, sigPtr, argbuf) => runEmAsmFunction(code, sigPtr, argbuf), "_emscripten_asm_const_int");
    _emscripten_asm_const_int.sig = "ippp";
    var _emscripten_force_exit = /* @__PURE__ */ __name((status) => {
      __emscripten_runtime_keepalive_clear();
      _exit(status);
    }, "_emscripten_force_exit");
    _emscripten_force_exit.sig = "vi";
    var getHeapMax = /* @__PURE__ */ __name(() => 2147483648, "getHeapMax");
    var growMemory = /* @__PURE__ */ __name((size) => {
      var b3 = wasmMemory.buffer;
      var pages = (size - b3.byteLength + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    }, "growMemory");
    var _emscripten_resize_heap = /* @__PURE__ */ __name((requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    }, "_emscripten_resize_heap");
    _emscripten_resize_heap.sig = "ip";
    var getExecutableName = /* @__PURE__ */ __name(() => thisProgram || "./this.program", "getExecutableName");
    var getEnvStrings = /* @__PURE__ */ __name(() => {
      if (!getEnvStrings.strings) {
        var lang = (typeof navigator == "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
        var env2 = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: lang, _: getExecutableName() };
        for (var x3 in ENV) {
          if (ENV[x3] === void 0)
            delete env2[x3];
          else
            env2[x3] = ENV[x3];
        }
        var strings = [];
        for (var x3 in env2) {
          strings.push(`${x3}=${env2[x3]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    }, "getEnvStrings");
    var stringToAscii = /* @__PURE__ */ __name((str, buffer) => {
      for (var i2 = 0; i2 < str.length; ++i2) {
        HEAP8[buffer++] = str.charCodeAt(i2);
      }
      HEAP8[buffer] = 0;
    }, "stringToAscii");
    var _environ_get = /* @__PURE__ */ __name((__environ, environ_buf) => {
      var bufSize = 0;
      getEnvStrings().forEach((string, i2) => {
        var ptr = environ_buf + bufSize;
        HEAPU32[__environ + i2 * 4 >> 2] = ptr;
        stringToAscii(string, ptr);
        bufSize += string.length + 1;
      });
      return 0;
    }, "_environ_get");
    _environ_get.sig = "ipp";
    var _environ_sizes_get = /* @__PURE__ */ __name((penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[penviron_count >> 2] = strings.length;
      var bufSize = 0;
      strings.forEach((string) => bufSize += string.length + 1);
      HEAPU32[penviron_buf_size >> 2] = bufSize;
      return 0;
    }, "_environ_sizes_get");
    _environ_sizes_get.sig = "ipp";
    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return e.errno;
      }
    }
    __name(_fd_close, "_fd_close");
    _fd_close.sig = "ii";
    function _fd_fdstat_get(fd, pbuf) {
      try {
        var rightsBase = 0;
        var rightsInheriting = 0;
        var flags2 = 0;
        {
          var stream = SYSCALLS.getStreamFromFD(fd);
          var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
        }
        HEAP8[pbuf] = type;
        HEAP16[pbuf + 2 >> 1] = flags2;
        HEAP64[pbuf + 8 >> 3] = BigInt(rightsBase);
        HEAP64[pbuf + 16 >> 3] = BigInt(rightsInheriting);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return e.errno;
      }
    }
    __name(_fd_fdstat_get, "_fd_fdstat_get");
    _fd_fdstat_get.sig = "iip";
    var doReadv = /* @__PURE__ */ __name((stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i2 = 0; i2 < iovcnt; i2++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0)
          return -1;
        ret += curr;
        if (curr < len)
          break;
        if (typeof offset != "undefined") {
          offset += curr;
        }
      }
      return ret;
    }, "doReadv");
    function _fd_pread(fd, iov, iovcnt, offset, pnum) {
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset))
          return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt, offset);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return e.errno;
      }
    }
    __name(_fd_pread, "_fd_pread");
    _fd_pread.sig = "iippjp";
    var doWritev = /* @__PURE__ */ __name((stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i2 = 0; i2 < iovcnt; i2++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0)
          return -1;
        ret += curr;
        if (curr < len) {
          break;
        }
        if (typeof offset != "undefined") {
          offset += curr;
        }
      }
      return ret;
    }, "doWritev");
    function _fd_pwrite(fd, iov, iovcnt, offset, pnum) {
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset))
          return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt, offset);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return e.errno;
      }
    }
    __name(_fd_pwrite, "_fd_pwrite");
    _fd_pwrite.sig = "iippjp";
    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return e.errno;
      }
    }
    __name(_fd_read, "_fd_read");
    _fd_read.sig = "iippp";
    function _fd_seek(fd, offset, whence, newOffset) {
      offset = bigintToI53Checked(offset);
      try {
        if (isNaN(offset))
          return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        HEAP64[newOffset >> 3] = BigInt(stream.position);
        if (stream.getdents && offset === 0 && whence === 0)
          stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return e.errno;
      }
    }
    __name(_fd_seek, "_fd_seek");
    _fd_seek.sig = "iijip";
    function _fd_sync(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        if (stream.stream_ops?.fsync) {
          return stream.stream_ops.fsync(stream);
        }
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return e.errno;
      }
    }
    __name(_fd_sync, "_fd_sync");
    _fd_sync.sig = "ii";
    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e.name === "ErrnoError"))
          throw e;
        return e.errno;
      }
    }
    __name(_fd_write, "_fd_write");
    _fd_write.sig = "iippp";
    var _getaddrinfo = /* @__PURE__ */ __name((node, service, hint, out2) => {
      var addr2 = 0;
      var port = 0;
      var flags2 = 0;
      var family = 0;
      var type = 0;
      var proto = 0;
      var ai;
      function allocaddrinfo(family2, type2, proto2, canon, addr3, port2) {
        var sa, salen, ai2;
        var errno;
        salen = family2 === 10 ? 28 : 16;
        addr3 = family2 === 10 ? inetNtop6(addr3) : inetNtop4(addr3);
        sa = _malloc(salen);
        errno = writeSockaddr(sa, family2, addr3, port2);
        assert(!errno);
        ai2 = _malloc(32);
        HEAP32[ai2 + 4 >> 2] = family2;
        HEAP32[ai2 + 8 >> 2] = type2;
        HEAP32[ai2 + 12 >> 2] = proto2;
        HEAPU32[ai2 + 24 >> 2] = canon;
        HEAPU32[ai2 + 20 >> 2] = sa;
        if (family2 === 10) {
          HEAP32[ai2 + 16 >> 2] = 28;
        } else {
          HEAP32[ai2 + 16 >> 2] = 16;
        }
        HEAP32[ai2 + 28 >> 2] = 0;
        return ai2;
      }
      __name(allocaddrinfo, "allocaddrinfo");
      if (hint) {
        flags2 = HEAP32[hint >> 2];
        family = HEAP32[hint + 4 >> 2];
        type = HEAP32[hint + 8 >> 2];
        proto = HEAP32[hint + 12 >> 2];
      }
      if (type && !proto) {
        proto = type === 2 ? 17 : 6;
      }
      if (!type && proto) {
        type = proto === 17 ? 2 : 1;
      }
      if (proto === 0) {
        proto = 6;
      }
      if (type === 0) {
        type = 1;
      }
      if (!node && !service) {
        return -2;
      }
      if (flags2 & ~(1 | 2 | 4 | 1024 | 8 | 16 | 32)) {
        return -1;
      }
      if (hint !== 0 && HEAP32[hint >> 2] & 2 && !node) {
        return -1;
      }
      if (flags2 & 32) {
        return -2;
      }
      if (type !== 0 && type !== 1 && type !== 2) {
        return -7;
      }
      if (family !== 0 && family !== 2 && family !== 10) {
        return -6;
      }
      if (service) {
        service = UTF8ToString(service);
        port = parseInt(service, 10);
        if (isNaN(port)) {
          if (flags2 & 1024) {
            return -2;
          }
          return -8;
        }
      }
      if (!node) {
        if (family === 0) {
          family = 2;
        }
        if ((flags2 & 1) === 0) {
          if (family === 2) {
            addr2 = _htonl(2130706433);
          } else {
            addr2 = [0, 0, 0, _htonl(1)];
          }
        }
        ai = allocaddrinfo(family, type, proto, null, addr2, port);
        HEAPU32[out2 >> 2] = ai;
        return 0;
      }
      node = UTF8ToString(node);
      addr2 = inetPton4(node);
      if (addr2 !== null) {
        if (family === 0 || family === 2) {
          family = 2;
        } else if (family === 10 && flags2 & 8) {
          addr2 = [0, 0, _htonl(65535), addr2];
          family = 10;
        } else {
          return -2;
        }
      } else {
        addr2 = inetPton6(node);
        if (addr2 !== null) {
          if (family === 0 || family === 10) {
            family = 10;
          } else {
            return -2;
          }
        }
      }
      if (addr2 != null) {
        ai = allocaddrinfo(family, type, proto, node, addr2, port);
        HEAPU32[out2 >> 2] = ai;
        return 0;
      }
      if (flags2 & 4) {
        return -2;
      }
      node = DNS.lookup_name(node);
      addr2 = inetPton4(node);
      if (family === 0) {
        family = 2;
      } else if (family === 10) {
        addr2 = [0, 0, _htonl(65535), addr2];
      }
      ai = allocaddrinfo(family, type, proto, null, addr2, port);
      HEAPU32[out2 >> 2] = ai;
      return 0;
    }, "_getaddrinfo");
    _getaddrinfo.sig = "ipppp";
    var _getnameinfo = /* @__PURE__ */ __name((sa, salen, node, nodelen, serv, servlen, flags2) => {
      var info4 = readSockaddr(sa, salen);
      if (info4.errno) {
        return -6;
      }
      var port = info4.port;
      var addr2 = info4.addr;
      var overflowed = false;
      if (node && nodelen) {
        var lookup;
        if (flags2 & 1 || !(lookup = DNS.lookup_addr(addr2))) {
          if (flags2 & 8) {
            return -2;
          }
        } else {
          addr2 = lookup;
        }
        var numBytesWrittenExclNull = stringToUTF8(addr2, node, nodelen);
        if (numBytesWrittenExclNull + 1 >= nodelen) {
          overflowed = true;
        }
      }
      if (serv && servlen) {
        port = "" + port;
        var numBytesWrittenExclNull = stringToUTF8(port, serv, servlen);
        if (numBytesWrittenExclNull + 1 >= servlen) {
          overflowed = true;
        }
      }
      if (overflowed) {
        return -12;
      }
      return 0;
    }, "_getnameinfo");
    _getnameinfo.sig = "ipipipii";
    var stringToNewUTF8 = /* @__PURE__ */ __name((str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = _malloc(size);
      if (ret)
        stringToUTF8(str, ret, size);
      return ret;
    }, "stringToNewUTF8");
    var removeFunction = /* @__PURE__ */ __name((index) => {
      functionsInTableMap.delete(getWasmTableEntry(index));
      setWasmTableEntry(index, null);
      freeTableIndexes.push(index);
    }, "removeFunction");
    var FS_createPath = FS.createPath;
    var FS_unlink = /* @__PURE__ */ __name((path) => FS.unlink(path), "FS_unlink");
    var FS_createLazyFile = FS.createLazyFile;
    var FS_createDevice = FS.createDevice;
    var setTempRet0 = /* @__PURE__ */ __name((val) => __emscripten_tempret_set(val), "setTempRet0");
    var _setTempRet0 = setTempRet0;
    Module["_setTempRet0"] = _setTempRet0;
    var getTempRet0 = /* @__PURE__ */ __name((val) => __emscripten_tempret_get(), "getTempRet0");
    var _getTempRet0 = getTempRet0;
    Module["_getTempRet0"] = _getTempRet0;
    registerWasmPlugin();
    FS.createPreloadedFile = FS_createPreloadedFile;
    FS.staticInit();
    Module["FS_createPath"] = FS.createPath;
    Module["FS_createDataFile"] = FS.createDataFile;
    Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
    Module["FS_unlink"] = FS.unlink;
    Module["FS_createLazyFile"] = FS.createLazyFile;
    Module["FS_createDevice"] = FS.createDevice;
    MEMFS.doesNotExistError = new FS.ErrnoError(44);
    MEMFS.doesNotExistError.stack = "<generic error, no stack>";
    if (ENVIRONMENT_IS_NODE) {
      NODEFS.staticInit();
    }
    var wasmImports = { __assert_fail: ___assert_fail, __call_sighandler: ___call_sighandler, __heap_base: ___heap_base, __indirect_function_table: wasmTable, __memory_base: ___memory_base, __stack_pointer: ___stack_pointer, __syscall__newselect: ___syscall__newselect, __syscall_bind: ___syscall_bind, __syscall_chdir: ___syscall_chdir, __syscall_chmod: ___syscall_chmod, __syscall_dup: ___syscall_dup, __syscall_dup3: ___syscall_dup3, __syscall_faccessat: ___syscall_faccessat, __syscall_fadvise64: ___syscall_fadvise64, __syscall_fallocate: ___syscall_fallocate, __syscall_fcntl64: ___syscall_fcntl64, __syscall_fdatasync: ___syscall_fdatasync, __syscall_fstat64: ___syscall_fstat64, __syscall_ftruncate64: ___syscall_ftruncate64, __syscall_getcwd: ___syscall_getcwd, __syscall_getdents64: ___syscall_getdents64, __syscall_ioctl: ___syscall_ioctl, __syscall_lstat64: ___syscall_lstat64, __syscall_mkdirat: ___syscall_mkdirat, __syscall_newfstatat: ___syscall_newfstatat, __syscall_openat: ___syscall_openat, __syscall_pipe: ___syscall_pipe, __syscall_readlinkat: ___syscall_readlinkat, __syscall_recvfrom: ___syscall_recvfrom, __syscall_renameat: ___syscall_renameat, __syscall_rmdir: ___syscall_rmdir, __syscall_sendto: ___syscall_sendto, __syscall_socket: ___syscall_socket, __syscall_stat64: ___syscall_stat64, __syscall_symlinkat: ___syscall_symlinkat, __syscall_truncate64: ___syscall_truncate64, __syscall_unlinkat: ___syscall_unlinkat, __table_base: ___table_base, _abort_js: __abort_js, _dlopen_js: __dlopen_js, _dlsym_js: __dlsym_js, _emscripten_runtime_keepalive_clear: __emscripten_runtime_keepalive_clear, _emscripten_system: __emscripten_system, _emscripten_throw_longjmp: __emscripten_throw_longjmp, _gmtime_js: __gmtime_js, _localtime_js: __localtime_js, _mmap_js: __mmap_js, _munmap_js: __munmap_js, _setitimer_js: __setitimer_js, _tzset_js: __tzset_js, clock_time_get: _clock_time_get, emscripten_asm_const_int: _emscripten_asm_const_int, emscripten_date_now: _emscripten_date_now, emscripten_force_exit: _emscripten_force_exit, emscripten_get_now: _emscripten_get_now, emscripten_resize_heap: _emscripten_resize_heap, environ_get: _environ_get, environ_sizes_get: _environ_sizes_get, exit: _exit, fd_close: _fd_close, fd_fdstat_get: _fd_fdstat_get, fd_pread: _fd_pread, fd_pwrite: _fd_pwrite, fd_read: _fd_read, fd_seek: _fd_seek, fd_sync: _fd_sync, fd_write: _fd_write, getaddrinfo: _getaddrinfo, getnameinfo: _getnameinfo, invoke_di, invoke_i, invoke_id, invoke_ii, invoke_iii, invoke_iiii, invoke_iiiii, invoke_iiiiii, invoke_iiiiiii, invoke_iiiiiiii, invoke_iiiiiiiii, invoke_iiiiiiiiii, invoke_iiiiiiiiiii, invoke_iiiiiiiiiiiiii, invoke_iiiiiiiiiiiiiiiiii, invoke_iiiiiji, invoke_iiiij, invoke_iiiijii, invoke_iiij, invoke_iiji, invoke_ij, invoke_ijiiiii, invoke_ijiiiiii, invoke_j, invoke_ji, invoke_jii, invoke_jiiii, invoke_jiiiiii, invoke_jiiiiiiiii, invoke_v, invoke_vi, invoke_vid, invoke_vii, invoke_viii, invoke_viiii, invoke_viiiii, invoke_viiiiii, invoke_viiiiiii, invoke_viiiiiiii, invoke_viiiiiiiii, invoke_viiiiiiiiiiii, invoke_viiiji, invoke_viij, invoke_viiji, invoke_viijii, invoke_viijiiii, invoke_vij, invoke_viji, invoke_vijiji, invoke_vj, invoke_vji, memory: wasmMemory, pglite_read_trampoline, pglite_write_trampoline, proc_exit: _proc_exit };
    var wasmExports;
    createWasm();
    var ___wasm_call_ctors = /* @__PURE__ */ __name(() => (___wasm_call_ctors = wasmExports["__wasm_call_ctors"])(), "___wasm_call_ctors");
    var _fopen = Module["_fopen"] = (a0, a1) => (_fopen = Module["_fopen"] = wasmExports["fopen"])(a0, a1);
    var _fflush = Module["_fflush"] = (a0) => (_fflush = Module["_fflush"] = wasmExports["fflush"])(a0);
    var ___errno_location = Module["___errno_location"] = () => (___errno_location = Module["___errno_location"] = wasmExports["__errno_location"])();
    var _ProcessInterrupts = Module["_ProcessInterrupts"] = () => (_ProcessInterrupts = Module["_ProcessInterrupts"] = wasmExports["ProcessInterrupts"])();
    var _errstart_cold = Module["_errstart_cold"] = (a0, a1) => (_errstart_cold = Module["_errstart_cold"] = wasmExports["errstart_cold"])(a0, a1);
    var _errcode = Module["_errcode"] = (a0) => (_errcode = Module["_errcode"] = wasmExports["errcode"])(a0);
    var _errmsg = Module["_errmsg"] = (a0, a1) => (_errmsg = Module["_errmsg"] = wasmExports["errmsg"])(a0, a1);
    var _errfinish = Module["_errfinish"] = (a0, a1, a2) => (_errfinish = Module["_errfinish"] = wasmExports["errfinish"])(a0, a1, a2);
    var _puts = Module["_puts"] = (a0) => (_puts = Module["_puts"] = wasmExports["puts"])(a0);
    var _errstart = Module["_errstart"] = (a0, a1) => (_errstart = Module["_errstart"] = wasmExports["errstart"])(a0, a1);
    var _errmsg_internal = Module["_errmsg_internal"] = (a0, a1) => (_errmsg_internal = Module["_errmsg_internal"] = wasmExports["errmsg_internal"])(a0, a1);
    var _errhint = Module["_errhint"] = (a0, a1) => (_errhint = Module["_errhint"] = wasmExports["errhint"])(a0, a1);
    var _raw_parser = Module["_raw_parser"] = (a0, a1) => (_raw_parser = Module["_raw_parser"] = wasmExports["raw_parser"])(a0, a1);
    var _gettimeofday = Module["_gettimeofday"] = (a0, a1) => (_gettimeofday = Module["_gettimeofday"] = wasmExports["gettimeofday"])(a0, a1);
    var _initStringInfo = Module["_initStringInfo"] = (a0) => (_initStringInfo = Module["_initStringInfo"] = wasmExports["initStringInfo"])(a0);
    var _appendStringInfoString = Module["_appendStringInfoString"] = (a0, a1) => (_appendStringInfoString = Module["_appendStringInfoString"] = wasmExports["appendStringInfoString"])(a0, a1);
    var _appendStringInfo = Module["_appendStringInfo"] = (a0, a1, a2) => (_appendStringInfo = Module["_appendStringInfo"] = wasmExports["appendStringInfo"])(a0, a1, a2);
    var _errdetail_internal = Module["_errdetail_internal"] = (a0, a1) => (_errdetail_internal = Module["_errdetail_internal"] = wasmExports["errdetail_internal"])(a0, a1);
    var _pfree = Module["_pfree"] = (a0) => (_pfree = Module["_pfree"] = wasmExports["pfree"])(a0);
    var _list_make1_impl = Module["_list_make1_impl"] = (a0, a1) => (_list_make1_impl = Module["_list_make1_impl"] = wasmExports["list_make1_impl"])(a0, a1);
    var _palloc0 = Module["_palloc0"] = (a0) => (_palloc0 = Module["_palloc0"] = wasmExports["palloc0"])(a0);
    var _lappend = Module["_lappend"] = (a0, a1) => (_lappend = Module["_lappend"] = wasmExports["lappend"])(a0, a1);
    var _GetCurrentTimestamp = Module["_GetCurrentTimestamp"] = () => (_GetCurrentTimestamp = Module["_GetCurrentTimestamp"] = wasmExports["GetCurrentTimestamp"])();
    var _pg_prng_double = Module["_pg_prng_double"] = (a0) => (_pg_prng_double = Module["_pg_prng_double"] = wasmExports["pg_prng_double"])(a0);
    var _pg_snprintf = Module["_pg_snprintf"] = (a0, a1, a2, a3) => (_pg_snprintf = Module["_pg_snprintf"] = wasmExports["pg_snprintf"])(a0, a1, a2, a3);
    var _errdetail = Module["_errdetail"] = (a0, a1) => (_errdetail = Module["_errdetail"] = wasmExports["errdetail"])(a0, a1);
    var _die = Module["_die"] = (a0) => (_die = Module["_die"] = wasmExports["die"])(a0);
    var _check_stack_depth = Module["_check_stack_depth"] = () => (_check_stack_depth = Module["_check_stack_depth"] = wasmExports["check_stack_depth"])();
    var _pre_format_elog_string = Module["_pre_format_elog_string"] = (a0, a1) => (_pre_format_elog_string = Module["_pre_format_elog_string"] = wasmExports["pre_format_elog_string"])(a0, a1);
    var _format_elog_string = Module["_format_elog_string"] = (a0, a1) => (_format_elog_string = Module["_format_elog_string"] = wasmExports["format_elog_string"])(a0, a1);
    var _pstrdup = Module["_pstrdup"] = (a0) => (_pstrdup = Module["_pstrdup"] = wasmExports["pstrdup"])(a0);
    var _SplitIdentifierString = Module["_SplitIdentifierString"] = (a0, a1, a2) => (_SplitIdentifierString = Module["_SplitIdentifierString"] = wasmExports["SplitIdentifierString"])(a0, a1, a2);
    var _list_free = Module["_list_free"] = (a0) => (_list_free = Module["_list_free"] = wasmExports["list_free"])(a0);
    var _guc_malloc = Module["_guc_malloc"] = (a0, a1) => (_guc_malloc = Module["_guc_malloc"] = wasmExports["guc_malloc"])(a0, a1);
    var _pg_strcasecmp = Module["_pg_strcasecmp"] = (a0, a1) => (_pg_strcasecmp = Module["_pg_strcasecmp"] = wasmExports["pg_strcasecmp"])(a0, a1);
    var _SetConfigOption = Module["_SetConfigOption"] = (a0, a1, a2, a3) => (_SetConfigOption = Module["_SetConfigOption"] = wasmExports["SetConfigOption"])(a0, a1, a2, a3);
    var _pg_sprintf = Module["_pg_sprintf"] = (a0, a1, a2) => (_pg_sprintf = Module["_pg_sprintf"] = wasmExports["pg_sprintf"])(a0, a1, a2);
    var _strcmp = Module["_strcmp"] = (a0, a1) => (_strcmp = Module["_strcmp"] = wasmExports["strcmp"])(a0, a1);
    var _strdup = Module["_strdup"] = (a0) => (_strdup = Module["_strdup"] = wasmExports["strdup"])(a0);
    var _atoi = Module["_atoi"] = (a0) => (_atoi = Module["_atoi"] = wasmExports["atoi"])(a0);
    var _strlcpy = Module["_strlcpy"] = (a0, a1, a2) => (_strlcpy = Module["_strlcpy"] = wasmExports["strlcpy"])(a0, a1, a2);
    var _pgl_shutdown = Module["_pgl_shutdown"] = () => (_pgl_shutdown = Module["_pgl_shutdown"] = wasmExports["pgl_shutdown"])();
    var _pgl_closed = Module["_pgl_closed"] = () => (_pgl_closed = Module["_pgl_closed"] = wasmExports["pgl_closed"])();
    var _MemoryContextReset = Module["_MemoryContextReset"] = (a0) => (_MemoryContextReset = Module["_MemoryContextReset"] = wasmExports["MemoryContextReset"])(a0);
    var _resetStringInfo = Module["_resetStringInfo"] = (a0) => (_resetStringInfo = Module["_resetStringInfo"] = wasmExports["resetStringInfo"])(a0);
    var _getc = Module["_getc"] = (a0) => (_getc = Module["_getc"] = wasmExports["getc"])(a0);
    var _appendStringInfoChar = Module["_appendStringInfoChar"] = (a0, a1) => (_appendStringInfoChar = Module["_appendStringInfoChar"] = wasmExports["appendStringInfoChar"])(a0, a1);
    var _pg_fprintf = Module["_pg_fprintf"] = (a0, a1, a2) => (_pg_fprintf = Module["_pg_fprintf"] = wasmExports["pg_fprintf"])(a0, a1, a2);
    var _strlen = Module["_strlen"] = (a0) => (_strlen = Module["_strlen"] = wasmExports["strlen"])(a0);
    var _strncmp = Module["_strncmp"] = (a0, a1, a2) => (_strncmp = Module["_strncmp"] = wasmExports["strncmp"])(a0, a1, a2);
    var _errhidestmt = Module["_errhidestmt"] = (a0) => (_errhidestmt = Module["_errhidestmt"] = wasmExports["errhidestmt"])(a0);
    var _GetTransactionSnapshot = Module["_GetTransactionSnapshot"] = () => (_GetTransactionSnapshot = Module["_GetTransactionSnapshot"] = wasmExports["GetTransactionSnapshot"])();
    var _PushActiveSnapshot = Module["_PushActiveSnapshot"] = (a0) => (_PushActiveSnapshot = Module["_PushActiveSnapshot"] = wasmExports["PushActiveSnapshot"])(a0);
    var _AllocSetContextCreateInternal = Module["_AllocSetContextCreateInternal"] = (a0, a1, a2, a3, a4) => (_AllocSetContextCreateInternal = Module["_AllocSetContextCreateInternal"] = wasmExports["AllocSetContextCreateInternal"])(a0, a1, a2, a3, a4);
    var _PopActiveSnapshot = Module["_PopActiveSnapshot"] = () => (_PopActiveSnapshot = Module["_PopActiveSnapshot"] = wasmExports["PopActiveSnapshot"])();
    var _CreateDestReceiver = Module["_CreateDestReceiver"] = (a0) => (_CreateDestReceiver = Module["_CreateDestReceiver"] = wasmExports["CreateDestReceiver"])(a0);
    var _CommandCounterIncrement = Module["_CommandCounterIncrement"] = () => (_CommandCounterIncrement = Module["_CommandCounterIncrement"] = wasmExports["CommandCounterIncrement"])();
    var _MemoryContextDelete = Module["_MemoryContextDelete"] = (a0) => (_MemoryContextDelete = Module["_MemoryContextDelete"] = wasmExports["MemoryContextDelete"])(a0);
    var _StartTransactionCommand = Module["_StartTransactionCommand"] = () => (_StartTransactionCommand = Module["_StartTransactionCommand"] = wasmExports["StartTransactionCommand"])();
    var _CommitTransactionCommand = Module["_CommitTransactionCommand"] = () => (_CommitTransactionCommand = Module["_CommitTransactionCommand"] = wasmExports["CommitTransactionCommand"])();
    var ___wasm_setjmp_test = Module["___wasm_setjmp_test"] = (a0, a1) => (___wasm_setjmp_test = Module["___wasm_setjmp_test"] = wasmExports["__wasm_setjmp_test"])(a0, a1);
    var _pg_printf = Module["_pg_printf"] = (a0, a1) => (_pg_printf = Module["_pg_printf"] = wasmExports["pg_printf"])(a0, a1);
    var ___wasm_setjmp = Module["___wasm_setjmp"] = (a0, a1, a2) => (___wasm_setjmp = Module["___wasm_setjmp"] = wasmExports["__wasm_setjmp"])(a0, a1, a2);
    var _FlushErrorState = Module["_FlushErrorState"] = () => (_FlushErrorState = Module["_FlushErrorState"] = wasmExports["FlushErrorState"])();
    var _emscripten_longjmp = Module["_emscripten_longjmp"] = (a0, a1) => (_emscripten_longjmp = Module["_emscripten_longjmp"] = wasmExports["emscripten_longjmp"])(a0, a1);
    var _enlargeStringInfo = Module["_enlargeStringInfo"] = (a0, a1) => (_enlargeStringInfo = Module["_enlargeStringInfo"] = wasmExports["enlargeStringInfo"])(a0, a1);
    var _malloc = Module["_malloc"] = (a0) => (_malloc = Module["_malloc"] = wasmExports["malloc"])(a0);
    var _realloc = Module["_realloc"] = (a0, a1) => (_realloc = Module["_realloc"] = wasmExports["realloc"])(a0, a1);
    var _getenv = Module["_getenv"] = (a0) => (_getenv = Module["_getenv"] = wasmExports["getenv"])(a0);
    var _strspn = Module["_strspn"] = (a0, a1) => (_strspn = Module["_strspn"] = wasmExports["strspn"])(a0, a1);
    var _memcpy = Module["_memcpy"] = (a0, a1, a2) => (_memcpy = Module["_memcpy"] = wasmExports["memcpy"])(a0, a1, a2);
    var _fileno = Module["_fileno"] = (a0) => (_fileno = Module["_fileno"] = wasmExports["fileno"])(a0);
    var _free = Module["_free"] = (a0) => (_free = Module["_free"] = wasmExports["free"])(a0);
    var _strchr = Module["_strchr"] = (a0, a1) => (_strchr = Module["_strchr"] = wasmExports["strchr"])(a0, a1);
    var _pg_vsnprintf = Module["_pg_vsnprintf"] = (a0, a1, a2, a3) => (_pg_vsnprintf = Module["_pg_vsnprintf"] = wasmExports["pg_vsnprintf"])(a0, a1, a2, a3);
    var _strcpy = Module["_strcpy"] = (a0, a1) => (_strcpy = Module["_strcpy"] = wasmExports["strcpy"])(a0, a1);
    var _psprintf = Module["_psprintf"] = (a0, a1) => (_psprintf = Module["_psprintf"] = wasmExports["psprintf"])(a0, a1);
    var _stat = Module["_stat"] = (a0, a1) => (_stat = Module["_stat"] = wasmExports["stat"])(a0, a1);
    var _memset = Module["_memset"] = (a0, a1, a2) => (_memset = Module["_memset"] = wasmExports["memset"])(a0, a1, a2);
    var _strftime = Module["_strftime"] = (a0, a1, a2, a3) => (_strftime = Module["_strftime"] = wasmExports["strftime"])(a0, a1, a2, a3);
    var _strstr = Module["_strstr"] = (a0, a1) => (_strstr = Module["_strstr"] = wasmExports["strstr"])(a0, a1);
    var _atexit = Module["_atexit"] = (a0) => (_atexit = Module["_atexit"] = wasmExports["atexit"])(a0);
    var _strtol = Module["_strtol"] = (a0, a1, a2) => (_strtol = Module["_strtol"] = wasmExports["strtol"])(a0, a1, a2);
    var _ferror = Module["_ferror"] = (a0) => (_ferror = Module["_ferror"] = wasmExports["ferror"])(a0);
    var _clear_error = Module["_clear_error"] = () => (_clear_error = Module["_clear_error"] = wasmExports["clear_error"])();
    var _interactive_one = Module["_interactive_one"] = (a0, a1) => (_interactive_one = Module["_interactive_one"] = wasmExports["interactive_one"])(a0, a1);
    var _pq_getmsgint = Module["_pq_getmsgint"] = (a0, a1) => (_pq_getmsgint = Module["_pq_getmsgint"] = wasmExports["pq_getmsgint"])(a0, a1);
    var _palloc = Module["_palloc"] = (a0) => (_palloc = Module["_palloc"] = wasmExports["palloc"])(a0);
    var _makeParamList = Module["_makeParamList"] = (a0) => (_makeParamList = Module["_makeParamList"] = wasmExports["makeParamList"])(a0);
    var _getTypeInputInfo = Module["_getTypeInputInfo"] = (a0, a1, a2) => (_getTypeInputInfo = Module["_getTypeInputInfo"] = wasmExports["getTypeInputInfo"])(a0, a1, a2);
    var _pnstrdup = Module["_pnstrdup"] = (a0, a1) => (_pnstrdup = Module["_pnstrdup"] = wasmExports["pnstrdup"])(a0, a1);
    var _MemoryContextSetParent = Module["_MemoryContextSetParent"] = (a0, a1) => (_MemoryContextSetParent = Module["_MemoryContextSetParent"] = wasmExports["MemoryContextSetParent"])(a0, a1);
    var _pgl_backend = Module["_pgl_backend"] = () => (_pgl_backend = Module["_pgl_backend"] = wasmExports["pgl_backend"])();
    var _pgl_initdb = Module["_pgl_initdb"] = () => (_pgl_initdb = Module["_pgl_initdb"] = wasmExports["pgl_initdb"])();
    var _main = Module["_main"] = (a0, a1) => (_main = Module["_main"] = wasmExports["__main_argc_argv"])(a0, a1);
    var _appendStringInfoStringQuoted = Module["_appendStringInfoStringQuoted"] = (a0, a1, a2) => (_appendStringInfoStringQuoted = Module["_appendStringInfoStringQuoted"] = wasmExports["appendStringInfoStringQuoted"])(a0, a1, a2);
    var _set_errcontext_domain = Module["_set_errcontext_domain"] = (a0) => (_set_errcontext_domain = Module["_set_errcontext_domain"] = wasmExports["set_errcontext_domain"])(a0);
    var _errcontext_msg = Module["_errcontext_msg"] = (a0, a1) => (_errcontext_msg = Module["_errcontext_msg"] = wasmExports["errcontext_msg"])(a0, a1);
    var _pg_is_ascii = Module["_pg_is_ascii"] = (a0) => (_pg_is_ascii = Module["_pg_is_ascii"] = wasmExports["pg_is_ascii"])(a0);
    var _memchr = Module["_memchr"] = (a0, a1, a2) => (_memchr = Module["_memchr"] = wasmExports["memchr"])(a0, a1, a2);
    var _strrchr = Module["_strrchr"] = (a0, a1) => (_strrchr = Module["_strrchr"] = wasmExports["strrchr"])(a0, a1);
    var _xsltFreeStylesheet = Module["_xsltFreeStylesheet"] = (a0) => (_xsltFreeStylesheet = Module["_xsltFreeStylesheet"] = wasmExports["xsltFreeStylesheet"])(a0);
    var _xsltParseStylesheetDoc = Module["_xsltParseStylesheetDoc"] = (a0) => (_xsltParseStylesheetDoc = Module["_xsltParseStylesheetDoc"] = wasmExports["xsltParseStylesheetDoc"])(a0);
    var _xsltSaveResultToString = Module["_xsltSaveResultToString"] = (a0, a1, a2, a3) => (_xsltSaveResultToString = Module["_xsltSaveResultToString"] = wasmExports["xsltSaveResultToString"])(a0, a1, a2, a3);
    var _xsltCleanupGlobals = Module["_xsltCleanupGlobals"] = () => (_xsltCleanupGlobals = Module["_xsltCleanupGlobals"] = wasmExports["xsltCleanupGlobals"])();
    var _xsltNewTransformContext = Module["_xsltNewTransformContext"] = (a0, a1) => (_xsltNewTransformContext = Module["_xsltNewTransformContext"] = wasmExports["xsltNewTransformContext"])(a0, a1);
    var _xsltFreeTransformContext = Module["_xsltFreeTransformContext"] = (a0) => (_xsltFreeTransformContext = Module["_xsltFreeTransformContext"] = wasmExports["xsltFreeTransformContext"])(a0);
    var _xsltApplyStylesheetUser = Module["_xsltApplyStylesheetUser"] = (a0, a1, a2, a3, a4, a5) => (_xsltApplyStylesheetUser = Module["_xsltApplyStylesheetUser"] = wasmExports["xsltApplyStylesheetUser"])(a0, a1, a2, a3, a4, a5);
    var _xsltNewSecurityPrefs = Module["_xsltNewSecurityPrefs"] = () => (_xsltNewSecurityPrefs = Module["_xsltNewSecurityPrefs"] = wasmExports["xsltNewSecurityPrefs"])();
    var _xsltFreeSecurityPrefs = Module["_xsltFreeSecurityPrefs"] = (a0) => (_xsltFreeSecurityPrefs = Module["_xsltFreeSecurityPrefs"] = wasmExports["xsltFreeSecurityPrefs"])(a0);
    var _xsltSetSecurityPrefs = Module["_xsltSetSecurityPrefs"] = (a0, a1, a2) => (_xsltSetSecurityPrefs = Module["_xsltSetSecurityPrefs"] = wasmExports["xsltSetSecurityPrefs"])(a0, a1, a2);
    var _xsltSetCtxtSecurityPrefs = Module["_xsltSetCtxtSecurityPrefs"] = (a0, a1) => (_xsltSetCtxtSecurityPrefs = Module["_xsltSetCtxtSecurityPrefs"] = wasmExports["xsltSetCtxtSecurityPrefs"])(a0, a1);
    var _xsltSecurityForbid = Module["_xsltSecurityForbid"] = (a0, a1, a2) => (_xsltSecurityForbid = Module["_xsltSecurityForbid"] = wasmExports["xsltSecurityForbid"])(a0, a1, a2);
    var _replace_percent_placeholders = Module["_replace_percent_placeholders"] = (a0, a1, a2, a3) => (_replace_percent_placeholders = Module["_replace_percent_placeholders"] = wasmExports["replace_percent_placeholders"])(a0, a1, a2, a3);
    var _MemoryContextAllocZero = Module["_MemoryContextAllocZero"] = (a0, a1) => (_MemoryContextAllocZero = Module["_MemoryContextAllocZero"] = wasmExports["MemoryContextAllocZero"])(a0, a1);
    var _hash_bytes = Module["_hash_bytes"] = (a0, a1) => (_hash_bytes = Module["_hash_bytes"] = wasmExports["hash_bytes"])(a0, a1);
    var _memcmp = Module["_memcmp"] = (a0, a1, a2) => (_memcmp = Module["_memcmp"] = wasmExports["memcmp"])(a0, a1, a2);
    var _repalloc = Module["_repalloc"] = (a0, a1) => (_repalloc = Module["_repalloc"] = wasmExports["repalloc"])(a0, a1);
    var _pg_qsort = Module["_pg_qsort"] = (a0, a1, a2, a3) => (_pg_qsort = Module["_pg_qsort"] = wasmExports["pg_qsort"])(a0, a1, a2, a3);
    var _OpenTransientFile = Module["_OpenTransientFile"] = (a0, a1) => (_OpenTransientFile = Module["_OpenTransientFile"] = wasmExports["OpenTransientFile"])(a0, a1);
    var _errcode_for_file_access = Module["_errcode_for_file_access"] = () => (_errcode_for_file_access = Module["_errcode_for_file_access"] = wasmExports["errcode_for_file_access"])();
    var _read = Module["_read"] = (a0, a1, a2) => (_read = Module["_read"] = wasmExports["read"])(a0, a1, a2);
    var _CloseTransientFile = Module["_CloseTransientFile"] = (a0) => (_CloseTransientFile = Module["_CloseTransientFile"] = wasmExports["CloseTransientFile"])(a0);
    var _time = Module["_time"] = (a0) => (_time = Module["_time"] = wasmExports["time"])(a0);
    var _close = Module["_close"] = (a0) => (_close = Module["_close"] = wasmExports["close"])(a0);
    var ___multi3 = Module["___multi3"] = (a0, a1, a2, a3, a4) => (___multi3 = Module["___multi3"] = wasmExports["__multi3"])(a0, a1, a2, a3, a4);
    var _isalnum = Module["_isalnum"] = (a0) => (_isalnum = Module["_isalnum"] = wasmExports["isalnum"])(a0);
    var _wait_result_to_str = Module["_wait_result_to_str"] = (a0) => (_wait_result_to_str = Module["_wait_result_to_str"] = wasmExports["wait_result_to_str"])(a0);
    var _memmove = Module["_memmove"] = (a0, a1, a2) => (_memmove = Module["_memmove"] = wasmExports["memmove"])(a0, a1, a2);
    var _pwrite = Module["_pwrite"] = (a0, a1, a2, a3) => (_pwrite = Module["_pwrite"] = wasmExports["pwrite"])(a0, a1, a2, a3);
    var _hash_bytes_extended = Module["_hash_bytes_extended"] = (a0, a1, a2) => (_hash_bytes_extended = Module["_hash_bytes_extended"] = wasmExports["hash_bytes_extended"])(a0, a1, a2);
    var _calloc = /* @__PURE__ */ __name((a0, a1) => (_calloc = wasmExports["calloc"])(a0, a1), "_calloc");
    var _IsValidJsonNumber = Module["_IsValidJsonNumber"] = (a0, a1) => (_IsValidJsonNumber = Module["_IsValidJsonNumber"] = wasmExports["IsValidJsonNumber"])(a0, a1);
    var _appendBinaryStringInfo = Module["_appendBinaryStringInfo"] = (a0, a1, a2) => (_appendBinaryStringInfo = Module["_appendBinaryStringInfo"] = wasmExports["appendBinaryStringInfo"])(a0, a1, a2);
    var _makeStringInfo = Module["_makeStringInfo"] = () => (_makeStringInfo = Module["_makeStringInfo"] = wasmExports["makeStringInfo"])();
    var _GetDatabaseEncodingName = Module["_GetDatabaseEncodingName"] = () => (_GetDatabaseEncodingName = Module["_GetDatabaseEncodingName"] = wasmExports["GetDatabaseEncodingName"])();
    var _ScanKeywordLookup = Module["_ScanKeywordLookup"] = (a0, a1) => (_ScanKeywordLookup = Module["_ScanKeywordLookup"] = wasmExports["ScanKeywordLookup"])(a0, a1);
    var _strtoul = Module["_strtoul"] = (a0, a1, a2) => (_strtoul = Module["_strtoul"] = wasmExports["strtoul"])(a0, a1, a2);
    var _sscanf = Module["_sscanf"] = (a0, a1, a2) => (_sscanf = Module["_sscanf"] = wasmExports["sscanf"])(a0, a1, a2);
    var _pg_prng_uint64 = Module["_pg_prng_uint64"] = (a0) => (_pg_prng_uint64 = Module["_pg_prng_uint64"] = wasmExports["pg_prng_uint64"])(a0);
    var _log = Module["_log"] = (a0) => (_log = Module["_log"] = wasmExports["log"])(a0);
    var _sin = Module["_sin"] = (a0) => (_sin = Module["_sin"] = wasmExports["sin"])(a0);
    var _readdir = Module["_readdir"] = (a0) => (_readdir = Module["_readdir"] = wasmExports["readdir"])(a0);
    var _forkname_to_number = Module["_forkname_to_number"] = (a0) => (_forkname_to_number = Module["_forkname_to_number"] = wasmExports["forkname_to_number"])(a0);
    var _unlink = Module["_unlink"] = (a0) => (_unlink = Module["_unlink"] = wasmExports["unlink"])(a0);
    var _pg_utf_mblen_private = Module["_pg_utf_mblen_private"] = (a0) => (_pg_utf_mblen_private = Module["_pg_utf_mblen_private"] = wasmExports["pg_utf_mblen_private"])(a0);
    var _bsearch = Module["_bsearch"] = (a0, a1, a2, a3, a4) => (_bsearch = Module["_bsearch"] = wasmExports["bsearch"])(a0, a1, a2, a3, a4);
    var _appendStringInfoSpaces = Module["_appendStringInfoSpaces"] = (a0, a1) => (_appendStringInfoSpaces = Module["_appendStringInfoSpaces"] = wasmExports["appendStringInfoSpaces"])(a0, a1);
    var _geteuid = Module["_geteuid"] = () => (_geteuid = Module["_geteuid"] = wasmExports["geteuid"])();
    var _fcntl = Module["_fcntl"] = (a0, a1, a2) => (_fcntl = Module["_fcntl"] = wasmExports["fcntl"])(a0, a1, a2);
    var _pg_popcount_optimized = Module["_pg_popcount_optimized"] = (a0, a1) => (_pg_popcount_optimized = Module["_pg_popcount_optimized"] = wasmExports["pg_popcount_optimized"])(a0, a1);
    var _pg_strong_random = Module["_pg_strong_random"] = (a0, a1) => (_pg_strong_random = Module["_pg_strong_random"] = wasmExports["pg_strong_random"])(a0, a1);
    var _open = Module["_open"] = (a0, a1, a2) => (_open = Module["_open"] = wasmExports["open"])(a0, a1, a2);
    var _pg_usleep = Module["_pg_usleep"] = (a0) => (_pg_usleep = Module["_pg_usleep"] = wasmExports["pg_usleep"])(a0);
    var _nanosleep = Module["_nanosleep"] = (a0, a1) => (_nanosleep = Module["_nanosleep"] = wasmExports["nanosleep"])(a0, a1);
    var _getpid = Module["_getpid"] = () => (_getpid = Module["_getpid"] = wasmExports["getpid"])();
    var _qsort_arg = Module["_qsort_arg"] = (a0, a1, a2, a3, a4) => (_qsort_arg = Module["_qsort_arg"] = wasmExports["qsort_arg"])(a0, a1, a2, a3, a4);
    var _fwrite = Module["_fwrite"] = (a0, a1, a2, a3) => (_fwrite = Module["_fwrite"] = wasmExports["fwrite"])(a0, a1, a2, a3);
    var _strerror = Module["_strerror"] = (a0) => (_strerror = Module["_strerror"] = wasmExports["strerror"])(a0);
    var _RelationGetNumberOfBlocksInFork = Module["_RelationGetNumberOfBlocksInFork"] = (a0, a1) => (_RelationGetNumberOfBlocksInFork = Module["_RelationGetNumberOfBlocksInFork"] = wasmExports["RelationGetNumberOfBlocksInFork"])(a0, a1);
    var _ExtendBufferedRel = Module["_ExtendBufferedRel"] = (a0, a1, a2, a3) => (_ExtendBufferedRel = Module["_ExtendBufferedRel"] = wasmExports["ExtendBufferedRel"])(a0, a1, a2, a3);
    var _MarkBufferDirty = Module["_MarkBufferDirty"] = (a0) => (_MarkBufferDirty = Module["_MarkBufferDirty"] = wasmExports["MarkBufferDirty"])(a0);
    var _XLogBeginInsert = Module["_XLogBeginInsert"] = () => (_XLogBeginInsert = Module["_XLogBeginInsert"] = wasmExports["XLogBeginInsert"])();
    var _XLogRegisterData = Module["_XLogRegisterData"] = (a0, a1) => (_XLogRegisterData = Module["_XLogRegisterData"] = wasmExports["XLogRegisterData"])(a0, a1);
    var _XLogInsert = Module["_XLogInsert"] = (a0, a1) => (_XLogInsert = Module["_XLogInsert"] = wasmExports["XLogInsert"])(a0, a1);
    var _UnlockReleaseBuffer = Module["_UnlockReleaseBuffer"] = (a0) => (_UnlockReleaseBuffer = Module["_UnlockReleaseBuffer"] = wasmExports["UnlockReleaseBuffer"])(a0);
    var _RegisterSnapshot = Module["_RegisterSnapshot"] = (a0) => (_RegisterSnapshot = Module["_RegisterSnapshot"] = wasmExports["RegisterSnapshot"])(a0);
    var _add_size = Module["_add_size"] = (a0, a1) => (_add_size = Module["_add_size"] = wasmExports["add_size"])(a0, a1);
    var _UnregisterSnapshot = Module["_UnregisterSnapshot"] = (a0) => (_UnregisterSnapshot = Module["_UnregisterSnapshot"] = wasmExports["UnregisterSnapshot"])(a0);
    var _s_init_lock_sema = Module["_s_init_lock_sema"] = (a0, a1) => (_s_init_lock_sema = Module["_s_init_lock_sema"] = wasmExports["s_init_lock_sema"])(a0, a1);
    var _tas_sema = Module["_tas_sema"] = (a0) => (_tas_sema = Module["_tas_sema"] = wasmExports["tas_sema"])(a0);
    var _s_lock = Module["_s_lock"] = (a0, a1, a2, a3) => (_s_lock = Module["_s_lock"] = wasmExports["s_lock"])(a0, a1, a2, a3);
    var _s_unlock_sema = Module["_s_unlock_sema"] = (a0) => (_s_unlock_sema = Module["_s_unlock_sema"] = wasmExports["s_unlock_sema"])(a0);
    var _brin_deform_tuple = Module["_brin_deform_tuple"] = (a0, a1, a2) => (_brin_deform_tuple = Module["_brin_deform_tuple"] = wasmExports["brin_deform_tuple"])(a0, a1, a2);
    var _log_newpage_buffer = Module["_log_newpage_buffer"] = (a0, a1) => (_log_newpage_buffer = Module["_log_newpage_buffer"] = wasmExports["log_newpage_buffer"])(a0, a1);
    var _brin_build_desc = Module["_brin_build_desc"] = (a0) => (_brin_build_desc = Module["_brin_build_desc"] = wasmExports["brin_build_desc"])(a0);
    var _LockBuffer = Module["_LockBuffer"] = (a0, a1) => (_LockBuffer = Module["_LockBuffer"] = wasmExports["LockBuffer"])(a0, a1);
    var _ReleaseBuffer = Module["_ReleaseBuffer"] = (a0) => (_ReleaseBuffer = Module["_ReleaseBuffer"] = wasmExports["ReleaseBuffer"])(a0);
    var _IndexGetRelation = Module["_IndexGetRelation"] = (a0, a1) => (_IndexGetRelation = Module["_IndexGetRelation"] = wasmExports["IndexGetRelation"])(a0, a1);
    var _table_open = Module["_table_open"] = (a0, a1) => (_table_open = Module["_table_open"] = wasmExports["table_open"])(a0, a1);
    var _ReadBufferExtended = Module["_ReadBufferExtended"] = (a0, a1, a2, a3, a4) => (_ReadBufferExtended = Module["_ReadBufferExtended"] = wasmExports["ReadBufferExtended"])(a0, a1, a2, a3, a4);
    var _table_close = Module["_table_close"] = (a0, a1) => (_table_close = Module["_table_close"] = wasmExports["table_close"])(a0, a1);
    var _build_reloptions = Module["_build_reloptions"] = (a0, a1, a2, a3, a4, a5) => (_build_reloptions = Module["_build_reloptions"] = wasmExports["build_reloptions"])(a0, a1, a2, a3, a4, a5);
    var _RelationGetIndexScan = Module["_RelationGetIndexScan"] = (a0, a1, a2) => (_RelationGetIndexScan = Module["_RelationGetIndexScan"] = wasmExports["RelationGetIndexScan"])(a0, a1, a2);
    var _pgstat_assoc_relation = Module["_pgstat_assoc_relation"] = (a0) => (_pgstat_assoc_relation = Module["_pgstat_assoc_relation"] = wasmExports["pgstat_assoc_relation"])(a0);
    var _FunctionCall4Coll = Module["_FunctionCall4Coll"] = (a0, a1, a2, a3, a4, a5) => (_FunctionCall4Coll = Module["_FunctionCall4Coll"] = wasmExports["FunctionCall4Coll"])(a0, a1, a2, a3, a4, a5);
    var _index_getprocinfo = Module["_index_getprocinfo"] = (a0, a1, a2) => (_index_getprocinfo = Module["_index_getprocinfo"] = wasmExports["index_getprocinfo"])(a0, a1, a2);
    var _fmgr_info_copy = Module["_fmgr_info_copy"] = (a0, a1, a2) => (_fmgr_info_copy = Module["_fmgr_info_copy"] = wasmExports["fmgr_info_copy"])(a0, a1, a2);
    var _brin_free_desc = Module["_brin_free_desc"] = (a0) => (_brin_free_desc = Module["_brin_free_desc"] = wasmExports["brin_free_desc"])(a0);
    var _FunctionCall1Coll = Module["_FunctionCall1Coll"] = (a0, a1, a2) => (_FunctionCall1Coll = Module["_FunctionCall1Coll"] = wasmExports["FunctionCall1Coll"])(a0, a1, a2);
    var _PageGetFreeSpace = Module["_PageGetFreeSpace"] = (a0) => (_PageGetFreeSpace = Module["_PageGetFreeSpace"] = wasmExports["PageGetFreeSpace"])(a0);
    var _BufferGetBlockNumber = Module["_BufferGetBlockNumber"] = (a0) => (_BufferGetBlockNumber = Module["_BufferGetBlockNumber"] = wasmExports["BufferGetBlockNumber"])(a0);
    var _BuildIndexInfo = Module["_BuildIndexInfo"] = (a0) => (_BuildIndexInfo = Module["_BuildIndexInfo"] = wasmExports["BuildIndexInfo"])(a0);
    var _Int64GetDatum = Module["_Int64GetDatum"] = (a0) => (_Int64GetDatum = Module["_Int64GetDatum"] = wasmExports["Int64GetDatum"])(a0);
    var _DirectFunctionCall2Coll = Module["_DirectFunctionCall2Coll"] = (a0, a1, a2, a3) => (_DirectFunctionCall2Coll = Module["_DirectFunctionCall2Coll"] = wasmExports["DirectFunctionCall2Coll"])(a0, a1, a2, a3);
    var _RecoveryInProgress = Module["_RecoveryInProgress"] = () => (_RecoveryInProgress = Module["_RecoveryInProgress"] = wasmExports["RecoveryInProgress"])();
    var _GetUserIdAndSecContext = Module["_GetUserIdAndSecContext"] = (a0, a1) => (_GetUserIdAndSecContext = Module["_GetUserIdAndSecContext"] = wasmExports["GetUserIdAndSecContext"])(a0, a1);
    var _SetUserIdAndSecContext = Module["_SetUserIdAndSecContext"] = (a0, a1) => (_SetUserIdAndSecContext = Module["_SetUserIdAndSecContext"] = wasmExports["SetUserIdAndSecContext"])(a0, a1);
    var _NewGUCNestLevel = Module["_NewGUCNestLevel"] = () => (_NewGUCNestLevel = Module["_NewGUCNestLevel"] = wasmExports["NewGUCNestLevel"])();
    var _RestrictSearchPath = Module["_RestrictSearchPath"] = () => (_RestrictSearchPath = Module["_RestrictSearchPath"] = wasmExports["RestrictSearchPath"])();
    var _index_open = Module["_index_open"] = (a0, a1) => (_index_open = Module["_index_open"] = wasmExports["index_open"])(a0, a1);
    var _object_ownercheck = Module["_object_ownercheck"] = (a0, a1, a2) => (_object_ownercheck = Module["_object_ownercheck"] = wasmExports["object_ownercheck"])(a0, a1, a2);
    var _aclcheck_error = Module["_aclcheck_error"] = (a0, a1, a2) => (_aclcheck_error = Module["_aclcheck_error"] = wasmExports["aclcheck_error"])(a0, a1, a2);
    var _AtEOXact_GUC = Module["_AtEOXact_GUC"] = (a0, a1) => (_AtEOXact_GUC = Module["_AtEOXact_GUC"] = wasmExports["AtEOXact_GUC"])(a0, a1);
    var _relation_close = Module["_relation_close"] = (a0, a1) => (_relation_close = Module["_relation_close"] = wasmExports["relation_close"])(a0, a1);
    var _GetUserId = Module["_GetUserId"] = () => (_GetUserId = Module["_GetUserId"] = wasmExports["GetUserId"])();
    var _ReadBuffer = Module["_ReadBuffer"] = (a0, a1) => (_ReadBuffer = Module["_ReadBuffer"] = wasmExports["ReadBuffer"])(a0, a1);
    var _index_close = Module["_index_close"] = (a0, a1) => (_index_close = Module["_index_close"] = wasmExports["index_close"])(a0, a1);
    var _datumCopy = Module["_datumCopy"] = (a0, a1, a2) => (_datumCopy = Module["_datumCopy"] = wasmExports["datumCopy"])(a0, a1, a2);
    var _lookup_type_cache = Module["_lookup_type_cache"] = (a0, a1) => (_lookup_type_cache = Module["_lookup_type_cache"] = wasmExports["lookup_type_cache"])(a0, a1);
    var _get_fn_opclass_options = Module["_get_fn_opclass_options"] = (a0) => (_get_fn_opclass_options = Module["_get_fn_opclass_options"] = wasmExports["get_fn_opclass_options"])(a0);
    var _pg_detoast_datum = Module["_pg_detoast_datum"] = (a0) => (_pg_detoast_datum = Module["_pg_detoast_datum"] = wasmExports["pg_detoast_datum"])(a0);
    var _init_local_reloptions = Module["_init_local_reloptions"] = (a0, a1) => (_init_local_reloptions = Module["_init_local_reloptions"] = wasmExports["init_local_reloptions"])(a0, a1);
    var _SysCacheGetAttrNotNull = Module["_SysCacheGetAttrNotNull"] = (a0, a1, a2) => (_SysCacheGetAttrNotNull = Module["_SysCacheGetAttrNotNull"] = wasmExports["SysCacheGetAttrNotNull"])(a0, a1, a2);
    var _ReleaseSysCache = Module["_ReleaseSysCache"] = (a0) => (_ReleaseSysCache = Module["_ReleaseSysCache"] = wasmExports["ReleaseSysCache"])(a0);
    var _fmgr_info_cxt = Module["_fmgr_info_cxt"] = (a0, a1, a2) => (_fmgr_info_cxt = Module["_fmgr_info_cxt"] = wasmExports["fmgr_info_cxt"])(a0, a1, a2);
    var _Float8GetDatum = Module["_Float8GetDatum"] = (a0) => (_Float8GetDatum = Module["_Float8GetDatum"] = wasmExports["Float8GetDatum"])(a0);
    var _numeric_sub = Module["_numeric_sub"] = (a0) => (_numeric_sub = Module["_numeric_sub"] = wasmExports["numeric_sub"])(a0);
    var _DirectFunctionCall1Coll = Module["_DirectFunctionCall1Coll"] = (a0, a1, a2) => (_DirectFunctionCall1Coll = Module["_DirectFunctionCall1Coll"] = wasmExports["DirectFunctionCall1Coll"])(a0, a1, a2);
    var _pg_detoast_datum_packed = Module["_pg_detoast_datum_packed"] = (a0) => (_pg_detoast_datum_packed = Module["_pg_detoast_datum_packed"] = wasmExports["pg_detoast_datum_packed"])(a0);
    var _add_local_int_reloption = Module["_add_local_int_reloption"] = (a0, a1, a2, a3, a4, a5, a6) => (_add_local_int_reloption = Module["_add_local_int_reloption"] = wasmExports["add_local_int_reloption"])(a0, a1, a2, a3, a4, a5, a6);
    var _getTypeOutputInfo = Module["_getTypeOutputInfo"] = (a0, a1, a2) => (_getTypeOutputInfo = Module["_getTypeOutputInfo"] = wasmExports["getTypeOutputInfo"])(a0, a1, a2);
    var _fmgr_info = Module["_fmgr_info"] = (a0, a1) => (_fmgr_info = Module["_fmgr_info"] = wasmExports["fmgr_info"])(a0, a1);
    var _OutputFunctionCall = Module["_OutputFunctionCall"] = (a0, a1) => (_OutputFunctionCall = Module["_OutputFunctionCall"] = wasmExports["OutputFunctionCall"])(a0, a1);
    var _cstring_to_text_with_len = Module["_cstring_to_text_with_len"] = (a0, a1) => (_cstring_to_text_with_len = Module["_cstring_to_text_with_len"] = wasmExports["cstring_to_text_with_len"])(a0, a1);
    var _accumArrayResult = Module["_accumArrayResult"] = (a0, a1, a2, a3, a4) => (_accumArrayResult = Module["_accumArrayResult"] = wasmExports["accumArrayResult"])(a0, a1, a2, a3, a4);
    var _makeArrayResult = Module["_makeArrayResult"] = (a0, a1) => (_makeArrayResult = Module["_makeArrayResult"] = wasmExports["makeArrayResult"])(a0, a1);
    var _OidOutputFunctionCall = Module["_OidOutputFunctionCall"] = (a0, a1) => (_OidOutputFunctionCall = Module["_OidOutputFunctionCall"] = wasmExports["OidOutputFunctionCall"])(a0, a1);
    var _cstring_to_text = Module["_cstring_to_text"] = (a0) => (_cstring_to_text = Module["_cstring_to_text"] = wasmExports["cstring_to_text"])(a0);
    var _LockRelationForExtension = Module["_LockRelationForExtension"] = (a0, a1) => (_LockRelationForExtension = Module["_LockRelationForExtension"] = wasmExports["LockRelationForExtension"])(a0, a1);
    var _UnlockRelationForExtension = Module["_UnlockRelationForExtension"] = (a0, a1) => (_UnlockRelationForExtension = Module["_UnlockRelationForExtension"] = wasmExports["UnlockRelationForExtension"])(a0, a1);
    var _smgropen = Module["_smgropen"] = (a0, a1) => (_smgropen = Module["_smgropen"] = wasmExports["smgropen"])(a0, a1);
    var _smgrpin = Module["_smgrpin"] = (a0) => (_smgrpin = Module["_smgrpin"] = wasmExports["smgrpin"])(a0);
    var _PageGetExactFreeSpace = Module["_PageGetExactFreeSpace"] = (a0) => (_PageGetExactFreeSpace = Module["_PageGetExactFreeSpace"] = wasmExports["PageGetExactFreeSpace"])(a0);
    var _PageInit = Module["_PageInit"] = (a0, a1, a2) => (_PageInit = Module["_PageInit"] = wasmExports["PageInit"])(a0, a1, a2);
    var _ItemPointerEquals = Module["_ItemPointerEquals"] = (a0, a1) => (_ItemPointerEquals = Module["_ItemPointerEquals"] = wasmExports["ItemPointerEquals"])(a0, a1);
    var _detoast_external_attr = Module["_detoast_external_attr"] = (a0) => (_detoast_external_attr = Module["_detoast_external_attr"] = wasmExports["detoast_external_attr"])(a0);
    var _CreateTemplateTupleDesc = Module["_CreateTemplateTupleDesc"] = (a0) => (_CreateTemplateTupleDesc = Module["_CreateTemplateTupleDesc"] = wasmExports["CreateTemplateTupleDesc"])(a0);
    var _TupleDescInitEntry = Module["_TupleDescInitEntry"] = (a0, a1, a2, a3, a4, a5) => (_TupleDescInitEntry = Module["_TupleDescInitEntry"] = wasmExports["TupleDescInitEntry"])(a0, a1, a2, a3, a4, a5);
    var _SearchSysCache1 = Module["_SearchSysCache1"] = (a0, a1) => (_SearchSysCache1 = Module["_SearchSysCache1"] = wasmExports["SearchSysCache1"])(a0, a1);
    var _SearchSysCacheList = Module["_SearchSysCacheList"] = (a0, a1, a2, a3, a4) => (_SearchSysCacheList = Module["_SearchSysCacheList"] = wasmExports["SearchSysCacheList"])(a0, a1, a2, a3, a4);
    var _format_operator = Module["_format_operator"] = (a0) => (_format_operator = Module["_format_operator"] = wasmExports["format_operator"])(a0);
    var _check_amop_signature = Module["_check_amop_signature"] = (a0, a1, a2, a3) => (_check_amop_signature = Module["_check_amop_signature"] = wasmExports["check_amop_signature"])(a0, a1, a2, a3);
    var _identify_opfamily_groups = Module["_identify_opfamily_groups"] = (a0, a1) => (_identify_opfamily_groups = Module["_identify_opfamily_groups"] = wasmExports["identify_opfamily_groups"])(a0, a1);
    var _format_type_be = Module["_format_type_be"] = (a0) => (_format_type_be = Module["_format_type_be"] = wasmExports["format_type_be"])(a0);
    var _ReleaseCatCacheList = Module["_ReleaseCatCacheList"] = (a0) => (_ReleaseCatCacheList = Module["_ReleaseCatCacheList"] = wasmExports["ReleaseCatCacheList"])(a0);
    var _check_amproc_signature = Module["_check_amproc_signature"] = (a0, a1, a2, a3, a4, a5) => (_check_amproc_signature = Module["_check_amproc_signature"] = wasmExports["check_amproc_signature"])(a0, a1, a2, a3, a4, a5);
    var _check_amoptsproc_signature = Module["_check_amoptsproc_signature"] = (a0) => (_check_amoptsproc_signature = Module["_check_amoptsproc_signature"] = wasmExports["check_amoptsproc_signature"])(a0);
    var _format_procedure = Module["_format_procedure"] = (a0) => (_format_procedure = Module["_format_procedure"] = wasmExports["format_procedure"])(a0);
    var _format_type_with_typemod = Module["_format_type_with_typemod"] = (a0, a1) => (_format_type_with_typemod = Module["_format_type_with_typemod"] = wasmExports["format_type_with_typemod"])(a0, a1);
    var _DatumGetEOHP = Module["_DatumGetEOHP"] = (a0) => (_DatumGetEOHP = Module["_DatumGetEOHP"] = wasmExports["DatumGetEOHP"])(a0);
    var _EOH_get_flat_size = Module["_EOH_get_flat_size"] = (a0) => (_EOH_get_flat_size = Module["_EOH_get_flat_size"] = wasmExports["EOH_get_flat_size"])(a0);
    var _EOH_flatten_into = Module["_EOH_flatten_into"] = (a0, a1, a2) => (_EOH_flatten_into = Module["_EOH_flatten_into"] = wasmExports["EOH_flatten_into"])(a0, a1, a2);
    var _getmissingattr = Module["_getmissingattr"] = (a0, a1, a2) => (_getmissingattr = Module["_getmissingattr"] = wasmExports["getmissingattr"])(a0, a1, a2);
    var _hash_create = Module["_hash_create"] = (a0, a1, a2, a3) => (_hash_create = Module["_hash_create"] = wasmExports["hash_create"])(a0, a1, a2, a3);
    var _hash_search = Module["_hash_search"] = (a0, a1, a2, a3) => (_hash_search = Module["_hash_search"] = wasmExports["hash_search"])(a0, a1, a2, a3);
    var _nocachegetattr = Module["_nocachegetattr"] = (a0, a1, a2) => (_nocachegetattr = Module["_nocachegetattr"] = wasmExports["nocachegetattr"])(a0, a1, a2);
    var _heap_form_tuple = Module["_heap_form_tuple"] = (a0, a1, a2) => (_heap_form_tuple = Module["_heap_form_tuple"] = wasmExports["heap_form_tuple"])(a0, a1, a2);
    var _heap_deform_tuple = Module["_heap_deform_tuple"] = (a0, a1, a2, a3) => (_heap_deform_tuple = Module["_heap_deform_tuple"] = wasmExports["heap_deform_tuple"])(a0, a1, a2, a3);
    var _heap_modify_tuple_by_cols = Module["_heap_modify_tuple_by_cols"] = (a0, a1, a2, a3, a4, a5) => (_heap_modify_tuple_by_cols = Module["_heap_modify_tuple_by_cols"] = wasmExports["heap_modify_tuple_by_cols"])(a0, a1, a2, a3, a4, a5);
    var _heap_freetuple = Module["_heap_freetuple"] = (a0) => (_heap_freetuple = Module["_heap_freetuple"] = wasmExports["heap_freetuple"])(a0);
    var _index_form_tuple = Module["_index_form_tuple"] = (a0, a1, a2) => (_index_form_tuple = Module["_index_form_tuple"] = wasmExports["index_form_tuple"])(a0, a1, a2);
    var _nocache_index_getattr = Module["_nocache_index_getattr"] = (a0, a1, a2) => (_nocache_index_getattr = Module["_nocache_index_getattr"] = wasmExports["nocache_index_getattr"])(a0, a1, a2);
    var _index_deform_tuple = Module["_index_deform_tuple"] = (a0, a1, a2, a3) => (_index_deform_tuple = Module["_index_deform_tuple"] = wasmExports["index_deform_tuple"])(a0, a1, a2, a3);
    var _slot_getsomeattrs_int = Module["_slot_getsomeattrs_int"] = (a0, a1) => (_slot_getsomeattrs_int = Module["_slot_getsomeattrs_int"] = wasmExports["slot_getsomeattrs_int"])(a0, a1);
    var _relation_open = Module["_relation_open"] = (a0, a1) => (_relation_open = Module["_relation_open"] = wasmExports["relation_open"])(a0, a1);
    var _try_relation_open = Module["_try_relation_open"] = (a0, a1) => (_try_relation_open = Module["_try_relation_open"] = wasmExports["try_relation_open"])(a0, a1);
    var _relation_openrv = Module["_relation_openrv"] = (a0, a1) => (_relation_openrv = Module["_relation_openrv"] = wasmExports["relation_openrv"])(a0, a1);
    var _RangeVarGetRelidExtended = Module["_RangeVarGetRelidExtended"] = (a0, a1, a2, a3, a4) => (_RangeVarGetRelidExtended = Module["_RangeVarGetRelidExtended"] = wasmExports["RangeVarGetRelidExtended"])(a0, a1, a2, a3, a4);
    var _add_reloption_kind = Module["_add_reloption_kind"] = () => (_add_reloption_kind = Module["_add_reloption_kind"] = wasmExports["add_reloption_kind"])();
    var _register_reloptions_validator = Module["_register_reloptions_validator"] = (a0, a1) => (_register_reloptions_validator = Module["_register_reloptions_validator"] = wasmExports["register_reloptions_validator"])(a0, a1);
    var _add_int_reloption = Module["_add_int_reloption"] = (a0, a1, a2, a3, a4, a5, a6) => (_add_int_reloption = Module["_add_int_reloption"] = wasmExports["add_int_reloption"])(a0, a1, a2, a3, a4, a5, a6);
    var _MemoryContextStrdup = Module["_MemoryContextStrdup"] = (a0, a1) => (_MemoryContextStrdup = Module["_MemoryContextStrdup"] = wasmExports["MemoryContextStrdup"])(a0, a1);
    var _deconstruct_array_builtin = Module["_deconstruct_array_builtin"] = (a0, a1, a2, a3, a4) => (_deconstruct_array_builtin = Module["_deconstruct_array_builtin"] = wasmExports["deconstruct_array_builtin"])(a0, a1, a2, a3, a4);
    var _defGetString = Module["_defGetString"] = (a0) => (_defGetString = Module["_defGetString"] = wasmExports["defGetString"])(a0);
    var _defGetBoolean = Module["_defGetBoolean"] = (a0) => (_defGetBoolean = Module["_defGetBoolean"] = wasmExports["defGetBoolean"])(a0);
    var _untransformRelOptions = Module["_untransformRelOptions"] = (a0) => (_untransformRelOptions = Module["_untransformRelOptions"] = wasmExports["untransformRelOptions"])(a0);
    var _text_to_cstring = Module["_text_to_cstring"] = (a0) => (_text_to_cstring = Module["_text_to_cstring"] = wasmExports["text_to_cstring"])(a0);
    var _makeString = Module["_makeString"] = (a0) => (_makeString = Module["_makeString"] = wasmExports["makeString"])(a0);
    var _makeDefElem = Module["_makeDefElem"] = (a0, a1, a2) => (_makeDefElem = Module["_makeDefElem"] = wasmExports["makeDefElem"])(a0, a1, a2);
    var _MemoryContextAlloc = Module["_MemoryContextAlloc"] = (a0, a1) => (_MemoryContextAlloc = Module["_MemoryContextAlloc"] = wasmExports["MemoryContextAlloc"])(a0, a1);
    var _parse_bool = Module["_parse_bool"] = (a0, a1) => (_parse_bool = Module["_parse_bool"] = wasmExports["parse_bool"])(a0, a1);
    var _parse_int = Module["_parse_int"] = (a0, a1, a2, a3) => (_parse_int = Module["_parse_int"] = wasmExports["parse_int"])(a0, a1, a2, a3);
    var _parse_real = Module["_parse_real"] = (a0, a1, a2, a3) => (_parse_real = Module["_parse_real"] = wasmExports["parse_real"])(a0, a1, a2, a3);
    var _ScanKeyInit = Module["_ScanKeyInit"] = (a0, a1, a2, a3, a4) => (_ScanKeyInit = Module["_ScanKeyInit"] = wasmExports["ScanKeyInit"])(a0, a1, a2, a3, a4);
    var _dsm_segment_handle = Module["_dsm_segment_handle"] = (a0) => (_dsm_segment_handle = Module["_dsm_segment_handle"] = wasmExports["dsm_segment_handle"])(a0);
    var _dsm_create = Module["_dsm_create"] = (a0, a1) => (_dsm_create = Module["_dsm_create"] = wasmExports["dsm_create"])(a0, a1);
    var _dsm_segment_address = Module["_dsm_segment_address"] = (a0) => (_dsm_segment_address = Module["_dsm_segment_address"] = wasmExports["dsm_segment_address"])(a0);
    var _dsm_attach = Module["_dsm_attach"] = (a0) => (_dsm_attach = Module["_dsm_attach"] = wasmExports["dsm_attach"])(a0);
    var _dsm_detach = Module["_dsm_detach"] = (a0) => (_dsm_detach = Module["_dsm_detach"] = wasmExports["dsm_detach"])(a0);
    var _ShmemInitStruct = Module["_ShmemInitStruct"] = (a0, a1, a2) => (_ShmemInitStruct = Module["_ShmemInitStruct"] = wasmExports["ShmemInitStruct"])(a0, a1, a2);
    var _LWLockAcquire = Module["_LWLockAcquire"] = (a0, a1) => (_LWLockAcquire = Module["_LWLockAcquire"] = wasmExports["LWLockAcquire"])(a0, a1);
    var _LWLockRelease = Module["_LWLockRelease"] = (a0) => (_LWLockRelease = Module["_LWLockRelease"] = wasmExports["LWLockRelease"])(a0);
    var _LWLockInitialize = Module["_LWLockInitialize"] = (a0, a1) => (_LWLockInitialize = Module["_LWLockInitialize"] = wasmExports["LWLockInitialize"])(a0, a1);
    var _GetCurrentCommandId = Module["_GetCurrentCommandId"] = (a0) => (_GetCurrentCommandId = Module["_GetCurrentCommandId"] = wasmExports["GetCurrentCommandId"])(a0);
    var _toast_open_indexes = Module["_toast_open_indexes"] = (a0, a1, a2, a3) => (_toast_open_indexes = Module["_toast_open_indexes"] = wasmExports["toast_open_indexes"])(a0, a1, a2, a3);
    var _toast_close_indexes = Module["_toast_close_indexes"] = (a0, a1, a2) => (_toast_close_indexes = Module["_toast_close_indexes"] = wasmExports["toast_close_indexes"])(a0, a1, a2);
    var _RelationGetIndexList = Module["_RelationGetIndexList"] = (a0) => (_RelationGetIndexList = Module["_RelationGetIndexList"] = wasmExports["RelationGetIndexList"])(a0);
    var _systable_beginscan = Module["_systable_beginscan"] = (a0, a1, a2, a3, a4, a5) => (_systable_beginscan = Module["_systable_beginscan"] = wasmExports["systable_beginscan"])(a0, a1, a2, a3, a4, a5);
    var _systable_getnext = Module["_systable_getnext"] = (a0) => (_systable_getnext = Module["_systable_getnext"] = wasmExports["systable_getnext"])(a0);
    var _systable_endscan = Module["_systable_endscan"] = (a0) => (_systable_endscan = Module["_systable_endscan"] = wasmExports["systable_endscan"])(a0);
    var _init_toast_snapshot = Module["_init_toast_snapshot"] = (a0) => (_init_toast_snapshot = Module["_init_toast_snapshot"] = wasmExports["init_toast_snapshot"])(a0);
    var _systable_beginscan_ordered = Module["_systable_beginscan_ordered"] = (a0, a1, a2, a3, a4) => (_systable_beginscan_ordered = Module["_systable_beginscan_ordered"] = wasmExports["systable_beginscan_ordered"])(a0, a1, a2, a3, a4);
    var _systable_getnext_ordered = Module["_systable_getnext_ordered"] = (a0, a1) => (_systable_getnext_ordered = Module["_systable_getnext_ordered"] = wasmExports["systable_getnext_ordered"])(a0, a1);
    var _systable_endscan_ordered = Module["_systable_endscan_ordered"] = (a0) => (_systable_endscan_ordered = Module["_systable_endscan_ordered"] = wasmExports["systable_endscan_ordered"])(a0);
    var _convert_tuples_by_position = Module["_convert_tuples_by_position"] = (a0, a1, a2) => (_convert_tuples_by_position = Module["_convert_tuples_by_position"] = wasmExports["convert_tuples_by_position"])(a0, a1, a2);
    var _execute_attr_map_tuple = Module["_execute_attr_map_tuple"] = (a0, a1) => (_execute_attr_map_tuple = Module["_execute_attr_map_tuple"] = wasmExports["execute_attr_map_tuple"])(a0, a1);
    var _ExecStoreVirtualTuple = Module["_ExecStoreVirtualTuple"] = (a0) => (_ExecStoreVirtualTuple = Module["_ExecStoreVirtualTuple"] = wasmExports["ExecStoreVirtualTuple"])(a0);
    var _bms_is_member = Module["_bms_is_member"] = (a0, a1) => (_bms_is_member = Module["_bms_is_member"] = wasmExports["bms_is_member"])(a0, a1);
    var _bms_add_member = Module["_bms_add_member"] = (a0, a1) => (_bms_add_member = Module["_bms_add_member"] = wasmExports["bms_add_member"])(a0, a1);
    var _CreateTupleDescCopy = Module["_CreateTupleDescCopy"] = (a0) => (_CreateTupleDescCopy = Module["_CreateTupleDescCopy"] = wasmExports["CreateTupleDescCopy"])(a0);
    var _ResourceOwnerEnlarge = Module["_ResourceOwnerEnlarge"] = (a0) => (_ResourceOwnerEnlarge = Module["_ResourceOwnerEnlarge"] = wasmExports["ResourceOwnerEnlarge"])(a0);
    var _ResourceOwnerRemember = Module["_ResourceOwnerRemember"] = (a0, a1, a2) => (_ResourceOwnerRemember = Module["_ResourceOwnerRemember"] = wasmExports["ResourceOwnerRemember"])(a0, a1, a2);
    var _DecrTupleDescRefCount = Module["_DecrTupleDescRefCount"] = (a0) => (_DecrTupleDescRefCount = Module["_DecrTupleDescRefCount"] = wasmExports["DecrTupleDescRefCount"])(a0);
    var _ResourceOwnerForget = Module["_ResourceOwnerForget"] = (a0, a1, a2) => (_ResourceOwnerForget = Module["_ResourceOwnerForget"] = wasmExports["ResourceOwnerForget"])(a0, a1, a2);
    var _TupleDescInitEntryCollation = Module["_TupleDescInitEntryCollation"] = (a0, a1, a2) => (_TupleDescInitEntryCollation = Module["_TupleDescInitEntryCollation"] = wasmExports["TupleDescInitEntryCollation"])(a0, a1, a2);
    var _pg_detoast_datum_copy = Module["_pg_detoast_datum_copy"] = (a0) => (_pg_detoast_datum_copy = Module["_pg_detoast_datum_copy"] = wasmExports["pg_detoast_datum_copy"])(a0);
    var _get_typlenbyvalalign = Module["_get_typlenbyvalalign"] = (a0, a1, a2, a3) => (_get_typlenbyvalalign = Module["_get_typlenbyvalalign"] = wasmExports["get_typlenbyvalalign"])(a0, a1, a2, a3);
    var _tbm_add_tuples = Module["_tbm_add_tuples"] = (a0, a1, a2, a3) => (_tbm_add_tuples = Module["_tbm_add_tuples"] = wasmExports["tbm_add_tuples"])(a0, a1, a2, a3);
    var _ginPostingListDecode = Module["_ginPostingListDecode"] = (a0, a1) => (_ginPostingListDecode = Module["_ginPostingListDecode"] = wasmExports["ginPostingListDecode"])(a0, a1);
    var _ItemPointerCompare = Module["_ItemPointerCompare"] = (a0, a1) => (_ItemPointerCompare = Module["_ItemPointerCompare"] = wasmExports["ItemPointerCompare"])(a0, a1);
    var _vacuum_delay_point = Module["_vacuum_delay_point"] = () => (_vacuum_delay_point = Module["_vacuum_delay_point"] = wasmExports["vacuum_delay_point"])();
    var _RecordFreeIndexPage = Module["_RecordFreeIndexPage"] = (a0, a1) => (_RecordFreeIndexPage = Module["_RecordFreeIndexPage"] = wasmExports["RecordFreeIndexPage"])(a0, a1);
    var _IndexFreeSpaceMapVacuum = Module["_IndexFreeSpaceMapVacuum"] = (a0) => (_IndexFreeSpaceMapVacuum = Module["_IndexFreeSpaceMapVacuum"] = wasmExports["IndexFreeSpaceMapVacuum"])(a0);
    var _GetFreeIndexPage = Module["_GetFreeIndexPage"] = (a0) => (_GetFreeIndexPage = Module["_GetFreeIndexPage"] = wasmExports["GetFreeIndexPage"])(a0);
    var _ConditionalLockBuffer = Module["_ConditionalLockBuffer"] = (a0) => (_ConditionalLockBuffer = Module["_ConditionalLockBuffer"] = wasmExports["ConditionalLockBuffer"])(a0);
    var _LockBufferForCleanup = Module["_LockBufferForCleanup"] = (a0) => (_LockBufferForCleanup = Module["_LockBufferForCleanup"] = wasmExports["LockBufferForCleanup"])(a0);
    var _gistcheckpage = Module["_gistcheckpage"] = (a0, a1) => (_gistcheckpage = Module["_gistcheckpage"] = wasmExports["gistcheckpage"])(a0, a1);
    var _smgrnblocks = Module["_smgrnblocks"] = (a0, a1) => (_smgrnblocks = Module["_smgrnblocks"] = wasmExports["smgrnblocks"])(a0, a1);
    var _list_free_deep = Module["_list_free_deep"] = (a0) => (_list_free_deep = Module["_list_free_deep"] = wasmExports["list_free_deep"])(a0);
    var _float_overflow_error = Module["_float_overflow_error"] = () => (_float_overflow_error = Module["_float_overflow_error"] = wasmExports["float_overflow_error"])();
    var _DirectFunctionCall5Coll = Module["_DirectFunctionCall5Coll"] = (a0, a1, a2, a3, a4, a5, a6) => (_DirectFunctionCall5Coll = Module["_DirectFunctionCall5Coll"] = wasmExports["DirectFunctionCall5Coll"])(a0, a1, a2, a3, a4, a5, a6);
    var __hash_getbuf = Module["__hash_getbuf"] = (a0, a1, a2, a3) => (__hash_getbuf = Module["__hash_getbuf"] = wasmExports["_hash_getbuf"])(a0, a1, a2, a3);
    var __hash_relbuf = Module["__hash_relbuf"] = (a0, a1) => (__hash_relbuf = Module["__hash_relbuf"] = wasmExports["_hash_relbuf"])(a0, a1);
    var __hash_get_indextuple_hashkey = Module["__hash_get_indextuple_hashkey"] = (a0) => (__hash_get_indextuple_hashkey = Module["__hash_get_indextuple_hashkey"] = wasmExports["_hash_get_indextuple_hashkey"])(a0);
    var __hash_getbuf_with_strategy = Module["__hash_getbuf_with_strategy"] = (a0, a1, a2, a3, a4) => (__hash_getbuf_with_strategy = Module["__hash_getbuf_with_strategy"] = wasmExports["_hash_getbuf_with_strategy"])(a0, a1, a2, a3, a4);
    var __hash_ovflblkno_to_bitno = Module["__hash_ovflblkno_to_bitno"] = (a0, a1) => (__hash_ovflblkno_to_bitno = Module["__hash_ovflblkno_to_bitno"] = wasmExports["_hash_ovflblkno_to_bitno"])(a0, a1);
    var _list_member_oid = Module["_list_member_oid"] = (a0, a1) => (_list_member_oid = Module["_list_member_oid"] = wasmExports["list_member_oid"])(a0, a1);
    var _HeapTupleSatisfiesVisibility = Module["_HeapTupleSatisfiesVisibility"] = (a0, a1, a2) => (_HeapTupleSatisfiesVisibility = Module["_HeapTupleSatisfiesVisibility"] = wasmExports["HeapTupleSatisfiesVisibility"])(a0, a1, a2);
    var _read_stream_begin_relation = Module["_read_stream_begin_relation"] = (a0, a1, a2, a3, a4, a5, a6) => (_read_stream_begin_relation = Module["_read_stream_begin_relation"] = wasmExports["read_stream_begin_relation"])(a0, a1, a2, a3, a4, a5, a6);
    var _GetAccessStrategy = Module["_GetAccessStrategy"] = (a0) => (_GetAccessStrategy = Module["_GetAccessStrategy"] = wasmExports["GetAccessStrategy"])(a0);
    var _FreeAccessStrategy = Module["_FreeAccessStrategy"] = (a0) => (_FreeAccessStrategy = Module["_FreeAccessStrategy"] = wasmExports["FreeAccessStrategy"])(a0);
    var _read_stream_end = Module["_read_stream_end"] = (a0) => (_read_stream_end = Module["_read_stream_end"] = wasmExports["read_stream_end"])(a0);
    var _heap_getnext = Module["_heap_getnext"] = (a0, a1) => (_heap_getnext = Module["_heap_getnext"] = wasmExports["heap_getnext"])(a0, a1);
    var _HeapTupleSatisfiesVacuum = Module["_HeapTupleSatisfiesVacuum"] = (a0, a1, a2) => (_HeapTupleSatisfiesVacuum = Module["_HeapTupleSatisfiesVacuum"] = wasmExports["HeapTupleSatisfiesVacuum"])(a0, a1, a2);
    var _HeapTupleGetUpdateXid = Module["_HeapTupleGetUpdateXid"] = (a0) => (_HeapTupleGetUpdateXid = Module["_HeapTupleGetUpdateXid"] = wasmExports["HeapTupleGetUpdateXid"])(a0);
    var _TransactionIdPrecedes = Module["_TransactionIdPrecedes"] = (a0, a1) => (_TransactionIdPrecedes = Module["_TransactionIdPrecedes"] = wasmExports["TransactionIdPrecedes"])(a0, a1);
    var _visibilitymap_clear = Module["_visibilitymap_clear"] = (a0, a1, a2, a3) => (_visibilitymap_clear = Module["_visibilitymap_clear"] = wasmExports["visibilitymap_clear"])(a0, a1, a2, a3);
    var _ExecFetchSlotHeapTuple = Module["_ExecFetchSlotHeapTuple"] = (a0, a1, a2) => (_ExecFetchSlotHeapTuple = Module["_ExecFetchSlotHeapTuple"] = wasmExports["ExecFetchSlotHeapTuple"])(a0, a1, a2);
    var _PageGetHeapFreeSpace = Module["_PageGetHeapFreeSpace"] = (a0) => (_PageGetHeapFreeSpace = Module["_PageGetHeapFreeSpace"] = wasmExports["PageGetHeapFreeSpace"])(a0);
    var _visibilitymap_pin = Module["_visibilitymap_pin"] = (a0, a1, a2) => (_visibilitymap_pin = Module["_visibilitymap_pin"] = wasmExports["visibilitymap_pin"])(a0, a1, a2);
    var _HeapTupleSatisfiesUpdate = Module["_HeapTupleSatisfiesUpdate"] = (a0, a1, a2) => (_HeapTupleSatisfiesUpdate = Module["_HeapTupleSatisfiesUpdate"] = wasmExports["HeapTupleSatisfiesUpdate"])(a0, a1, a2);
    var _TransactionIdIsCurrentTransactionId = Module["_TransactionIdIsCurrentTransactionId"] = (a0) => (_TransactionIdIsCurrentTransactionId = Module["_TransactionIdIsCurrentTransactionId"] = wasmExports["TransactionIdIsCurrentTransactionId"])(a0);
    var _GetMultiXactIdMembers = Module["_GetMultiXactIdMembers"] = (a0, a1, a2, a3) => (_GetMultiXactIdMembers = Module["_GetMultiXactIdMembers"] = wasmExports["GetMultiXactIdMembers"])(a0, a1, a2, a3);
    var _TransactionIdIsInProgress = Module["_TransactionIdIsInProgress"] = (a0) => (_TransactionIdIsInProgress = Module["_TransactionIdIsInProgress"] = wasmExports["TransactionIdIsInProgress"])(a0);
    var _TransactionIdDidCommit = Module["_TransactionIdDidCommit"] = (a0) => (_TransactionIdDidCommit = Module["_TransactionIdDidCommit"] = wasmExports["TransactionIdDidCommit"])(a0);
    var _bms_free = Module["_bms_free"] = (a0) => (_bms_free = Module["_bms_free"] = wasmExports["bms_free"])(a0);
    var _bms_add_members = Module["_bms_add_members"] = (a0, a1) => (_bms_add_members = Module["_bms_add_members"] = wasmExports["bms_add_members"])(a0, a1);
    var _bms_next_member = Module["_bms_next_member"] = (a0, a1) => (_bms_next_member = Module["_bms_next_member"] = wasmExports["bms_next_member"])(a0, a1);
    var _bms_overlap = Module["_bms_overlap"] = (a0, a1) => (_bms_overlap = Module["_bms_overlap"] = wasmExports["bms_overlap"])(a0, a1);
    var _MultiXactIdPrecedes = Module["_MultiXactIdPrecedes"] = (a0, a1) => (_MultiXactIdPrecedes = Module["_MultiXactIdPrecedes"] = wasmExports["MultiXactIdPrecedes"])(a0, a1);
    var _heap_tuple_needs_eventual_freeze = Module["_heap_tuple_needs_eventual_freeze"] = (a0) => (_heap_tuple_needs_eventual_freeze = Module["_heap_tuple_needs_eventual_freeze"] = wasmExports["heap_tuple_needs_eventual_freeze"])(a0);
    var _PrefetchBuffer = Module["_PrefetchBuffer"] = (a0, a1, a2, a3) => (_PrefetchBuffer = Module["_PrefetchBuffer"] = wasmExports["PrefetchBuffer"])(a0, a1, a2, a3);
    var _XLogRecGetBlockTagExtended = Module["_XLogRecGetBlockTagExtended"] = (a0, a1, a2, a3, a4, a5) => (_XLogRecGetBlockTagExtended = Module["_XLogRecGetBlockTagExtended"] = wasmExports["XLogRecGetBlockTagExtended"])(a0, a1, a2, a3, a4, a5);
    var _read_stream_next_buffer = Module["_read_stream_next_buffer"] = (a0, a1) => (_read_stream_next_buffer = Module["_read_stream_next_buffer"] = wasmExports["read_stream_next_buffer"])(a0, a1);
    var _smgrexists = Module["_smgrexists"] = (a0, a1) => (_smgrexists = Module["_smgrexists"] = wasmExports["smgrexists"])(a0, a1);
    var _table_slot_create = Module["_table_slot_create"] = (a0, a1) => (_table_slot_create = Module["_table_slot_create"] = wasmExports["table_slot_create"])(a0, a1);
    var _ExecDropSingleTupleTableSlot = Module["_ExecDropSingleTupleTableSlot"] = (a0) => (_ExecDropSingleTupleTableSlot = Module["_ExecDropSingleTupleTableSlot"] = wasmExports["ExecDropSingleTupleTableSlot"])(a0);
    var _CreateExecutorState = Module["_CreateExecutorState"] = () => (_CreateExecutorState = Module["_CreateExecutorState"] = wasmExports["CreateExecutorState"])();
    var _MakePerTupleExprContext = Module["_MakePerTupleExprContext"] = (a0) => (_MakePerTupleExprContext = Module["_MakePerTupleExprContext"] = wasmExports["MakePerTupleExprContext"])(a0);
    var _GetOldestNonRemovableTransactionId = Module["_GetOldestNonRemovableTransactionId"] = (a0) => (_GetOldestNonRemovableTransactionId = Module["_GetOldestNonRemovableTransactionId"] = wasmExports["GetOldestNonRemovableTransactionId"])(a0);
    var _FreeExecutorState = Module["_FreeExecutorState"] = (a0) => (_FreeExecutorState = Module["_FreeExecutorState"] = wasmExports["FreeExecutorState"])(a0);
    var _ExecStoreHeapTuple = Module["_ExecStoreHeapTuple"] = (a0, a1, a2) => (_ExecStoreHeapTuple = Module["_ExecStoreHeapTuple"] = wasmExports["ExecStoreHeapTuple"])(a0, a1, a2);
    var _visibilitymap_get_status = Module["_visibilitymap_get_status"] = (a0, a1, a2) => (_visibilitymap_get_status = Module["_visibilitymap_get_status"] = wasmExports["visibilitymap_get_status"])(a0, a1, a2);
    var _ExecStoreAllNullTuple = Module["_ExecStoreAllNullTuple"] = (a0) => (_ExecStoreAllNullTuple = Module["_ExecStoreAllNullTuple"] = wasmExports["ExecStoreAllNullTuple"])(a0);
    var _hash_seq_init = Module["_hash_seq_init"] = (a0, a1) => (_hash_seq_init = Module["_hash_seq_init"] = wasmExports["hash_seq_init"])(a0, a1);
    var _hash_seq_search = Module["_hash_seq_search"] = (a0) => (_hash_seq_search = Module["_hash_seq_search"] = wasmExports["hash_seq_search"])(a0);
    var _ftruncate = Module["_ftruncate"] = (a0, a1) => (_ftruncate = Module["_ftruncate"] = wasmExports["ftruncate"])(a0, a1);
    var _fd_fsync_fname = Module["_fd_fsync_fname"] = (a0, a1) => (_fd_fsync_fname = Module["_fd_fsync_fname"] = wasmExports["fd_fsync_fname"])(a0, a1);
    var _get_namespace_name = Module["_get_namespace_name"] = (a0) => (_get_namespace_name = Module["_get_namespace_name"] = wasmExports["get_namespace_name"])(a0);
    var _vac_estimate_reltuples = Module["_vac_estimate_reltuples"] = (a0, a1, a2, a3) => (_vac_estimate_reltuples = Module["_vac_estimate_reltuples"] = wasmExports["vac_estimate_reltuples"])(a0, a1, a2, a3);
    var _WaitLatch = Module["_WaitLatch"] = (a0, a1, a2, a3) => (_WaitLatch = Module["_WaitLatch"] = wasmExports["WaitLatch"])(a0, a1, a2, a3);
    var _ResetLatch = Module["_ResetLatch"] = (a0) => (_ResetLatch = Module["_ResetLatch"] = wasmExports["ResetLatch"])(a0);
    var _WalUsageAccumDiff = Module["_WalUsageAccumDiff"] = (a0, a1, a2) => (_WalUsageAccumDiff = Module["_WalUsageAccumDiff"] = wasmExports["WalUsageAccumDiff"])(a0, a1, a2);
    var _BufferUsageAccumDiff = Module["_BufferUsageAccumDiff"] = (a0, a1, a2) => (_BufferUsageAccumDiff = Module["_BufferUsageAccumDiff"] = wasmExports["BufferUsageAccumDiff"])(a0, a1, a2);
    var _GetRecordedFreeSpace = Module["_GetRecordedFreeSpace"] = (a0, a1) => (_GetRecordedFreeSpace = Module["_GetRecordedFreeSpace"] = wasmExports["GetRecordedFreeSpace"])(a0, a1);
    var _clock_gettime = Module["_clock_gettime"] = (a0, a1) => (_clock_gettime = Module["_clock_gettime"] = wasmExports["clock_gettime"])(a0, a1);
    var _visibilitymap_prepare_truncate = Module["_visibilitymap_prepare_truncate"] = (a0, a1) => (_visibilitymap_prepare_truncate = Module["_visibilitymap_prepare_truncate"] = wasmExports["visibilitymap_prepare_truncate"])(a0, a1);
    var _pg_class_aclcheck = Module["_pg_class_aclcheck"] = (a0, a1, a2) => (_pg_class_aclcheck = Module["_pg_class_aclcheck"] = wasmExports["pg_class_aclcheck"])(a0, a1, a2);
    var _btboolcmp = Module["_btboolcmp"] = (a0) => (_btboolcmp = Module["_btboolcmp"] = wasmExports["btboolcmp"])(a0);
    var _btint2cmp = Module["_btint2cmp"] = (a0) => (_btint2cmp = Module["_btint2cmp"] = wasmExports["btint2cmp"])(a0);
    var _btint4cmp = Module["_btint4cmp"] = (a0) => (_btint4cmp = Module["_btint4cmp"] = wasmExports["btint4cmp"])(a0);
    var _btint8cmp = Module["_btint8cmp"] = (a0) => (_btint8cmp = Module["_btint8cmp"] = wasmExports["btint8cmp"])(a0);
    var _btoidcmp = Module["_btoidcmp"] = (a0) => (_btoidcmp = Module["_btoidcmp"] = wasmExports["btoidcmp"])(a0);
    var _btcharcmp = Module["_btcharcmp"] = (a0) => (_btcharcmp = Module["_btcharcmp"] = wasmExports["btcharcmp"])(a0);
    var __bt_form_posting = Module["__bt_form_posting"] = (a0, a1, a2) => (__bt_form_posting = Module["__bt_form_posting"] = wasmExports["_bt_form_posting"])(a0, a1, a2);
    var __bt_mkscankey = Module["__bt_mkscankey"] = (a0, a1) => (__bt_mkscankey = Module["__bt_mkscankey"] = wasmExports["_bt_mkscankey"])(a0, a1);
    var __bt_checkpage = Module["__bt_checkpage"] = (a0, a1) => (__bt_checkpage = Module["__bt_checkpage"] = wasmExports["_bt_checkpage"])(a0, a1);
    var __bt_compare = Module["__bt_compare"] = (a0, a1, a2, a3) => (__bt_compare = Module["__bt_compare"] = wasmExports["_bt_compare"])(a0, a1, a2, a3);
    var __bt_relbuf = Module["__bt_relbuf"] = (a0, a1) => (__bt_relbuf = Module["__bt_relbuf"] = wasmExports["_bt_relbuf"])(a0, a1);
    var __bt_search = Module["__bt_search"] = (a0, a1, a2, a3, a4) => (__bt_search = Module["__bt_search"] = wasmExports["_bt_search"])(a0, a1, a2, a3, a4);
    var __bt_binsrch_insert = Module["__bt_binsrch_insert"] = (a0, a1) => (__bt_binsrch_insert = Module["__bt_binsrch_insert"] = wasmExports["_bt_binsrch_insert"])(a0, a1);
    var __bt_freestack = Module["__bt_freestack"] = (a0) => (__bt_freestack = Module["__bt_freestack"] = wasmExports["_bt_freestack"])(a0);
    var __bt_metaversion = Module["__bt_metaversion"] = (a0, a1, a2) => (__bt_metaversion = Module["__bt_metaversion"] = wasmExports["_bt_metaversion"])(a0, a1, a2);
    var __bt_allequalimage = Module["__bt_allequalimage"] = (a0, a1) => (__bt_allequalimage = Module["__bt_allequalimage"] = wasmExports["_bt_allequalimage"])(a0, a1);
    var _before_shmem_exit = Module["_before_shmem_exit"] = (a0, a1) => (_before_shmem_exit = Module["_before_shmem_exit"] = wasmExports["before_shmem_exit"])(a0, a1);
    var _cancel_before_shmem_exit = Module["_cancel_before_shmem_exit"] = (a0, a1) => (_cancel_before_shmem_exit = Module["_cancel_before_shmem_exit"] = wasmExports["cancel_before_shmem_exit"])(a0, a1);
    var _pg_re_throw = Module["_pg_re_throw"] = () => (_pg_re_throw = Module["_pg_re_throw"] = wasmExports["pg_re_throw"])();
    var _get_opfamily_member = Module["_get_opfamily_member"] = (a0, a1, a2, a3) => (_get_opfamily_member = Module["_get_opfamily_member"] = wasmExports["get_opfamily_member"])(a0, a1, a2, a3);
    var __bt_check_natts = Module["__bt_check_natts"] = (a0, a1, a2, a3) => (__bt_check_natts = Module["__bt_check_natts"] = wasmExports["_bt_check_natts"])(a0, a1, a2, a3);
    var _timestamptz_to_str = Module["_timestamptz_to_str"] = (a0) => (_timestamptz_to_str = Module["_timestamptz_to_str"] = wasmExports["timestamptz_to_str"])(a0);
    var _XLogRecGetBlockRefInfo = Module["_XLogRecGetBlockRefInfo"] = (a0, a1, a2, a3, a4) => (_XLogRecGetBlockRefInfo = Module["_XLogRecGetBlockRefInfo"] = wasmExports["XLogRecGetBlockRefInfo"])(a0, a1, a2, a3, a4);
    var _varstr_cmp = Module["_varstr_cmp"] = (a0, a1, a2, a3, a4) => (_varstr_cmp = Module["_varstr_cmp"] = wasmExports["varstr_cmp"])(a0, a1, a2, a3, a4);
    var _exprType = Module["_exprType"] = (a0) => (_exprType = Module["_exprType"] = wasmExports["exprType"])(a0);
    var _GetActiveSnapshot = Module["_GetActiveSnapshot"] = () => (_GetActiveSnapshot = Module["_GetActiveSnapshot"] = wasmExports["GetActiveSnapshot"])();
    var _errdetail_relkind_not_supported = Module["_errdetail_relkind_not_supported"] = (a0) => (_errdetail_relkind_not_supported = Module["_errdetail_relkind_not_supported"] = wasmExports["errdetail_relkind_not_supported"])(a0);
    var _table_openrv = Module["_table_openrv"] = (a0, a1) => (_table_openrv = Module["_table_openrv"] = wasmExports["table_openrv"])(a0, a1);
    var _clamp_row_est = Module["_clamp_row_est"] = (a0) => (_clamp_row_est = Module["_clamp_row_est"] = wasmExports["clamp_row_est"])(a0);
    var _estimate_expression_value = Module["_estimate_expression_value"] = (a0, a1) => (_estimate_expression_value = Module["_estimate_expression_value"] = wasmExports["estimate_expression_value"])(a0, a1);
    var _XLogFlush = Module["_XLogFlush"] = (a0) => (_XLogFlush = Module["_XLogFlush"] = wasmExports["XLogFlush"])(a0);
    var _get_call_result_type = Module["_get_call_result_type"] = (a0, a1, a2) => (_get_call_result_type = Module["_get_call_result_type"] = wasmExports["get_call_result_type"])(a0, a1, a2);
    var _HeapTupleHeaderGetDatum = Module["_HeapTupleHeaderGetDatum"] = (a0) => (_HeapTupleHeaderGetDatum = Module["_HeapTupleHeaderGetDatum"] = wasmExports["HeapTupleHeaderGetDatum"])(a0);
    var _GenericXLogStart = Module["_GenericXLogStart"] = (a0) => (_GenericXLogStart = Module["_GenericXLogStart"] = wasmExports["GenericXLogStart"])(a0);
    var _GenericXLogRegisterBuffer = Module["_GenericXLogRegisterBuffer"] = (a0, a1, a2) => (_GenericXLogRegisterBuffer = Module["_GenericXLogRegisterBuffer"] = wasmExports["GenericXLogRegisterBuffer"])(a0, a1, a2);
    var _GenericXLogFinish = Module["_GenericXLogFinish"] = (a0) => (_GenericXLogFinish = Module["_GenericXLogFinish"] = wasmExports["GenericXLogFinish"])(a0);
    var _GenericXLogAbort = Module["_GenericXLogAbort"] = (a0) => (_GenericXLogAbort = Module["_GenericXLogAbort"] = wasmExports["GenericXLogAbort"])(a0);
    var _errmsg_plural = Module["_errmsg_plural"] = (a0, a1, a2, a3) => (_errmsg_plural = Module["_errmsg_plural"] = wasmExports["errmsg_plural"])(a0, a1, a2, a3);
    var _ReadMultiXactIdRange = Module["_ReadMultiXactIdRange"] = (a0, a1) => (_ReadMultiXactIdRange = Module["_ReadMultiXactIdRange"] = wasmExports["ReadMultiXactIdRange"])(a0, a1);
    var _MultiXactIdPrecedesOrEquals = Module["_MultiXactIdPrecedesOrEquals"] = (a0, a1) => (_MultiXactIdPrecedesOrEquals = Module["_MultiXactIdPrecedesOrEquals"] = wasmExports["MultiXactIdPrecedesOrEquals"])(a0, a1);
    var _init_MultiFuncCall = Module["_init_MultiFuncCall"] = (a0) => (_init_MultiFuncCall = Module["_init_MultiFuncCall"] = wasmExports["init_MultiFuncCall"])(a0);
    var _TupleDescGetAttInMetadata = Module["_TupleDescGetAttInMetadata"] = (a0) => (_TupleDescGetAttInMetadata = Module["_TupleDescGetAttInMetadata"] = wasmExports["TupleDescGetAttInMetadata"])(a0);
    var _per_MultiFuncCall = Module["_per_MultiFuncCall"] = (a0) => (_per_MultiFuncCall = Module["_per_MultiFuncCall"] = wasmExports["per_MultiFuncCall"])(a0);
    var _BuildTupleFromCStrings = Module["_BuildTupleFromCStrings"] = (a0, a1) => (_BuildTupleFromCStrings = Module["_BuildTupleFromCStrings"] = wasmExports["BuildTupleFromCStrings"])(a0, a1);
    var _end_MultiFuncCall = Module["_end_MultiFuncCall"] = (a0, a1) => (_end_MultiFuncCall = Module["_end_MultiFuncCall"] = wasmExports["end_MultiFuncCall"])(a0, a1);
    var _GetCurrentSubTransactionId = Module["_GetCurrentSubTransactionId"] = () => (_GetCurrentSubTransactionId = Module["_GetCurrentSubTransactionId"] = wasmExports["GetCurrentSubTransactionId"])();
    var _WaitForBackgroundWorkerShutdown = Module["_WaitForBackgroundWorkerShutdown"] = (a0) => (_WaitForBackgroundWorkerShutdown = Module["_WaitForBackgroundWorkerShutdown"] = wasmExports["WaitForBackgroundWorkerShutdown"])(a0);
    var _RegisterDynamicBackgroundWorker = Module["_RegisterDynamicBackgroundWorker"] = (a0, a1) => (_RegisterDynamicBackgroundWorker = Module["_RegisterDynamicBackgroundWorker"] = wasmExports["RegisterDynamicBackgroundWorker"])(a0, a1);
    var _BackgroundWorkerUnblockSignals = Module["_BackgroundWorkerUnblockSignals"] = () => (_BackgroundWorkerUnblockSignals = Module["_BackgroundWorkerUnblockSignals"] = wasmExports["BackgroundWorkerUnblockSignals"])();
    var _BackgroundWorkerInitializeConnectionByOid = Module["_BackgroundWorkerInitializeConnectionByOid"] = (a0, a1, a2) => (_BackgroundWorkerInitializeConnectionByOid = Module["_BackgroundWorkerInitializeConnectionByOid"] = wasmExports["BackgroundWorkerInitializeConnectionByOid"])(a0, a1, a2);
    var _GetDatabaseEncoding = Module["_GetDatabaseEncoding"] = () => (_GetDatabaseEncoding = Module["_GetDatabaseEncoding"] = wasmExports["GetDatabaseEncoding"])();
    var _RmgrNotFound = Module["_RmgrNotFound"] = (a0) => (_RmgrNotFound = Module["_RmgrNotFound"] = wasmExports["RmgrNotFound"])(a0);
    var _InitMaterializedSRF = Module["_InitMaterializedSRF"] = (a0, a1) => (_InitMaterializedSRF = Module["_InitMaterializedSRF"] = wasmExports["InitMaterializedSRF"])(a0, a1);
    var _tuplestore_putvalues = Module["_tuplestore_putvalues"] = (a0, a1, a2, a3) => (_tuplestore_putvalues = Module["_tuplestore_putvalues"] = wasmExports["tuplestore_putvalues"])(a0, a1, a2, a3);
    var _AllocateFile = Module["_AllocateFile"] = (a0, a1) => (_AllocateFile = Module["_AllocateFile"] = wasmExports["AllocateFile"])(a0, a1);
    var _FreeFile = Module["_FreeFile"] = (a0) => (_FreeFile = Module["_FreeFile"] = wasmExports["FreeFile"])(a0);
    var _fd_durable_rename = Module["_fd_durable_rename"] = (a0, a1, a2) => (_fd_durable_rename = Module["_fd_durable_rename"] = wasmExports["fd_durable_rename"])(a0, a1, a2);
    var _BlessTupleDesc = Module["_BlessTupleDesc"] = (a0) => (_BlessTupleDesc = Module["_BlessTupleDesc"] = wasmExports["BlessTupleDesc"])(a0);
    var _fstat = Module["_fstat"] = (a0, a1) => (_fstat = Module["_fstat"] = wasmExports["fstat"])(a0, a1);
    var _superuser_arg = Module["_superuser_arg"] = (a0) => (_superuser_arg = Module["_superuser_arg"] = wasmExports["superuser_arg"])(a0);
    var _wal_segment_close = Module["_wal_segment_close"] = (a0) => (_wal_segment_close = Module["_wal_segment_close"] = wasmExports["wal_segment_close"])(a0);
    var _wal_segment_open = Module["_wal_segment_open"] = (a0, a1, a2) => (_wal_segment_open = Module["_wal_segment_open"] = wasmExports["wal_segment_open"])(a0, a1, a2);
    var _XLogReaderAllocate = Module["_XLogReaderAllocate"] = (a0, a1, a2, a3) => (_XLogReaderAllocate = Module["_XLogReaderAllocate"] = wasmExports["XLogReaderAllocate"])(a0, a1, a2, a3);
    var _XLogReadRecord = Module["_XLogReadRecord"] = (a0, a1) => (_XLogReadRecord = Module["_XLogReadRecord"] = wasmExports["XLogReadRecord"])(a0, a1);
    var _XLogReaderFree = Module["_XLogReaderFree"] = (a0) => (_XLogReaderFree = Module["_XLogReaderFree"] = wasmExports["XLogReaderFree"])(a0);
    var _GetCurrentTransactionNestLevel = Module["_GetCurrentTransactionNestLevel"] = () => (_GetCurrentTransactionNestLevel = Module["_GetCurrentTransactionNestLevel"] = wasmExports["GetCurrentTransactionNestLevel"])();
    var _ResourceOwnerCreate = Module["_ResourceOwnerCreate"] = (a0, a1) => (_ResourceOwnerCreate = Module["_ResourceOwnerCreate"] = wasmExports["ResourceOwnerCreate"])(a0, a1);
    var _RegisterXactCallback = Module["_RegisterXactCallback"] = (a0, a1) => (_RegisterXactCallback = Module["_RegisterXactCallback"] = wasmExports["RegisterXactCallback"])(a0, a1);
    var _RegisterSubXactCallback = Module["_RegisterSubXactCallback"] = (a0, a1) => (_RegisterSubXactCallback = Module["_RegisterSubXactCallback"] = wasmExports["RegisterSubXactCallback"])(a0, a1);
    var _BeginInternalSubTransaction = Module["_BeginInternalSubTransaction"] = (a0) => (_BeginInternalSubTransaction = Module["_BeginInternalSubTransaction"] = wasmExports["BeginInternalSubTransaction"])(a0);
    var _ReleaseCurrentSubTransaction = Module["_ReleaseCurrentSubTransaction"] = () => (_ReleaseCurrentSubTransaction = Module["_ReleaseCurrentSubTransaction"] = wasmExports["ReleaseCurrentSubTransaction"])();
    var _ResourceOwnerDelete = Module["_ResourceOwnerDelete"] = (a0) => (_ResourceOwnerDelete = Module["_ResourceOwnerDelete"] = wasmExports["ResourceOwnerDelete"])(a0);
    var _RollbackAndReleaseCurrentSubTransaction = Module["_RollbackAndReleaseCurrentSubTransaction"] = () => (_RollbackAndReleaseCurrentSubTransaction = Module["_RollbackAndReleaseCurrentSubTransaction"] = wasmExports["RollbackAndReleaseCurrentSubTransaction"])();
    var _ReleaseExternalFD = Module["_ReleaseExternalFD"] = () => (_ReleaseExternalFD = Module["_ReleaseExternalFD"] = wasmExports["ReleaseExternalFD"])();
    var _GetFlushRecPtr = Module["_GetFlushRecPtr"] = (a0) => (_GetFlushRecPtr = Module["_GetFlushRecPtr"] = wasmExports["GetFlushRecPtr"])(a0);
    var _GetXLogReplayRecPtr = Module["_GetXLogReplayRecPtr"] = (a0) => (_GetXLogReplayRecPtr = Module["_GetXLogReplayRecPtr"] = wasmExports["GetXLogReplayRecPtr"])(a0);
    var _TimestampDifferenceMilliseconds = Module["_TimestampDifferenceMilliseconds"] = (a0, a1) => (_TimestampDifferenceMilliseconds = Module["_TimestampDifferenceMilliseconds"] = wasmExports["TimestampDifferenceMilliseconds"])(a0, a1);
    var _numeric_in = Module["_numeric_in"] = (a0) => (_numeric_in = Module["_numeric_in"] = wasmExports["numeric_in"])(a0);
    var _DirectFunctionCall3Coll = Module["_DirectFunctionCall3Coll"] = (a0, a1, a2, a3, a4) => (_DirectFunctionCall3Coll = Module["_DirectFunctionCall3Coll"] = wasmExports["DirectFunctionCall3Coll"])(a0, a1, a2, a3, a4);
    var _XLogFindNextRecord = Module["_XLogFindNextRecord"] = (a0, a1) => (_XLogFindNextRecord = Module["_XLogFindNextRecord"] = wasmExports["XLogFindNextRecord"])(a0, a1);
    var _RestoreBlockImage = Module["_RestoreBlockImage"] = (a0, a1, a2) => (_RestoreBlockImage = Module["_RestoreBlockImage"] = wasmExports["RestoreBlockImage"])(a0, a1, a2);
    var _timestamptz_in = Module["_timestamptz_in"] = (a0) => (_timestamptz_in = Module["_timestamptz_in"] = wasmExports["timestamptz_in"])(a0);
    var _fscanf = Module["_fscanf"] = (a0, a1, a2) => (_fscanf = Module["_fscanf"] = wasmExports["fscanf"])(a0, a1, a2);
    var _XLogRecStoreStats = Module["_XLogRecStoreStats"] = (a0, a1) => (_XLogRecStoreStats = Module["_XLogRecStoreStats"] = wasmExports["XLogRecStoreStats"])(a0, a1);
    var _hash_get_num_entries = Module["_hash_get_num_entries"] = (a0) => (_hash_get_num_entries = Module["_hash_get_num_entries"] = wasmExports["hash_get_num_entries"])(a0);
    var _read_local_xlog_page_no_wait = Module["_read_local_xlog_page_no_wait"] = (a0, a1, a2, a3, a4) => (_read_local_xlog_page_no_wait = Module["_read_local_xlog_page_no_wait"] = wasmExports["read_local_xlog_page_no_wait"])(a0, a1, a2, a3, a4);
    var _escape_json = Module["_escape_json"] = (a0, a1) => (_escape_json = Module["_escape_json"] = wasmExports["escape_json"])(a0, a1);
    var _getegid = Module["_getegid"] = () => (_getegid = Module["_getegid"] = wasmExports["getegid"])();
    var _pg_checksum_page = Module["_pg_checksum_page"] = (a0, a1) => (_pg_checksum_page = Module["_pg_checksum_page"] = wasmExports["pg_checksum_page"])(a0, a1);
    var _bbsink_forward_end_archive = Module["_bbsink_forward_end_archive"] = (a0) => (_bbsink_forward_end_archive = Module["_bbsink_forward_end_archive"] = wasmExports["bbsink_forward_end_archive"])(a0);
    var _bbsink_forward_begin_manifest = Module["_bbsink_forward_begin_manifest"] = (a0) => (_bbsink_forward_begin_manifest = Module["_bbsink_forward_begin_manifest"] = wasmExports["bbsink_forward_begin_manifest"])(a0);
    var _bbsink_forward_end_manifest = Module["_bbsink_forward_end_manifest"] = (a0) => (_bbsink_forward_end_manifest = Module["_bbsink_forward_end_manifest"] = wasmExports["bbsink_forward_end_manifest"])(a0);
    var _bbsink_forward_end_backup = Module["_bbsink_forward_end_backup"] = (a0, a1, a2) => (_bbsink_forward_end_backup = Module["_bbsink_forward_end_backup"] = wasmExports["bbsink_forward_end_backup"])(a0, a1, a2);
    var _bbsink_forward_cleanup = Module["_bbsink_forward_cleanup"] = (a0) => (_bbsink_forward_cleanup = Module["_bbsink_forward_cleanup"] = wasmExports["bbsink_forward_cleanup"])(a0);
    var _list_concat = Module["_list_concat"] = (a0, a1) => (_list_concat = Module["_list_concat"] = wasmExports["list_concat"])(a0, a1);
    var _bbsink_forward_begin_backup = Module["_bbsink_forward_begin_backup"] = (a0) => (_bbsink_forward_begin_backup = Module["_bbsink_forward_begin_backup"] = wasmExports["bbsink_forward_begin_backup"])(a0);
    var _bbsink_forward_archive_contents = Module["_bbsink_forward_archive_contents"] = (a0, a1) => (_bbsink_forward_archive_contents = Module["_bbsink_forward_archive_contents"] = wasmExports["bbsink_forward_archive_contents"])(a0, a1);
    var _bbsink_forward_begin_archive = Module["_bbsink_forward_begin_archive"] = (a0, a1) => (_bbsink_forward_begin_archive = Module["_bbsink_forward_begin_archive"] = wasmExports["bbsink_forward_begin_archive"])(a0, a1);
    var _bbsink_forward_manifest_contents = Module["_bbsink_forward_manifest_contents"] = (a0, a1) => (_bbsink_forward_manifest_contents = Module["_bbsink_forward_manifest_contents"] = wasmExports["bbsink_forward_manifest_contents"])(a0, a1);
    var _has_privs_of_role = Module["_has_privs_of_role"] = (a0, a1) => (_has_privs_of_role = Module["_has_privs_of_role"] = wasmExports["has_privs_of_role"])(a0, a1);
    var _BaseBackupAddTarget = Module["_BaseBackupAddTarget"] = (a0, a1, a2) => (_BaseBackupAddTarget = Module["_BaseBackupAddTarget"] = wasmExports["BaseBackupAddTarget"])(a0, a1, a2);
    var _list_copy = Module["_list_copy"] = (a0) => (_list_copy = Module["_list_copy"] = wasmExports["list_copy"])(a0);
    var _tuplestore_puttuple = Module["_tuplestore_puttuple"] = (a0, a1) => (_tuplestore_puttuple = Module["_tuplestore_puttuple"] = wasmExports["tuplestore_puttuple"])(a0, a1);
    var _makeRangeVar = Module["_makeRangeVar"] = (a0, a1, a2) => (_makeRangeVar = Module["_makeRangeVar"] = wasmExports["makeRangeVar"])(a0, a1, a2);
    var _fread = Module["_fread"] = (a0, a1, a2, a3) => (_fread = Module["_fread"] = wasmExports["fread"])(a0, a1, a2, a3);
    var _clearerr = Module["_clearerr"] = (a0) => (_clearerr = Module["_clearerr"] = wasmExports["clearerr"])(a0);
    var _copyObjectImpl = Module["_copyObjectImpl"] = (a0) => (_copyObjectImpl = Module["_copyObjectImpl"] = wasmExports["copyObjectImpl"])(a0);
    var _lappend_oid = Module["_lappend_oid"] = (a0, a1) => (_lappend_oid = Module["_lappend_oid"] = wasmExports["lappend_oid"])(a0, a1);
    var _makeTypeNameFromNameList = Module["_makeTypeNameFromNameList"] = (a0) => (_makeTypeNameFromNameList = Module["_makeTypeNameFromNameList"] = wasmExports["makeTypeNameFromNameList"])(a0);
    var _get_rel_name = Module["_get_rel_name"] = (a0) => (_get_rel_name = Module["_get_rel_name"] = wasmExports["get_rel_name"])(a0);
    var _get_element_type = Module["_get_element_type"] = (a0) => (_get_element_type = Module["_get_element_type"] = wasmExports["get_element_type"])(a0);
    var _object_aclcheck = Module["_object_aclcheck"] = (a0, a1, a2, a3) => (_object_aclcheck = Module["_object_aclcheck"] = wasmExports["object_aclcheck"])(a0, a1, a2, a3);
    var _superuser = Module["_superuser"] = () => (_superuser = Module["_superuser"] = wasmExports["superuser"])();
    var _SearchSysCacheAttName = Module["_SearchSysCacheAttName"] = (a0, a1) => (_SearchSysCacheAttName = Module["_SearchSysCacheAttName"] = wasmExports["SearchSysCacheAttName"])(a0, a1);
    var _get_typtype = Module["_get_typtype"] = (a0) => (_get_typtype = Module["_get_typtype"] = wasmExports["get_typtype"])(a0);
    var _list_delete_last = Module["_list_delete_last"] = (a0) => (_list_delete_last = Module["_list_delete_last"] = wasmExports["list_delete_last"])(a0);
    var _GetSysCacheOid = Module["_GetSysCacheOid"] = (a0, a1, a2, a3, a4, a5) => (_GetSysCacheOid = Module["_GetSysCacheOid"] = wasmExports["GetSysCacheOid"])(a0, a1, a2, a3, a4, a5);
    var _transformExpr = Module["_transformExpr"] = (a0, a1, a2) => (_transformExpr = Module["_transformExpr"] = wasmExports["transformExpr"])(a0, a1, a2);
    var _equal = Module["_equal"] = (a0, a1) => (_equal = Module["_equal"] = wasmExports["equal"])(a0, a1);
    var _pull_var_clause = Module["_pull_var_clause"] = (a0, a1) => (_pull_var_clause = Module["_pull_var_clause"] = wasmExports["pull_var_clause"])(a0, a1);
    var _get_attname = Module["_get_attname"] = (a0, a1, a2) => (_get_attname = Module["_get_attname"] = wasmExports["get_attname"])(a0, a1, a2);
    var _coerce_to_target_type = Module["_coerce_to_target_type"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_coerce_to_target_type = Module["_coerce_to_target_type"] = wasmExports["coerce_to_target_type"])(a0, a1, a2, a3, a4, a5, a6, a7);
    var _parser_errposition = Module["_parser_errposition"] = (a0, a1) => (_parser_errposition = Module["_parser_errposition"] = wasmExports["parser_errposition"])(a0, a1);
    var _exprTypmod = Module["_exprTypmod"] = (a0) => (_exprTypmod = Module["_exprTypmod"] = wasmExports["exprTypmod"])(a0);
    var _get_base_element_type = Module["_get_base_element_type"] = (a0) => (_get_base_element_type = Module["_get_base_element_type"] = wasmExports["get_base_element_type"])(a0);
    var _get_rel_namespace = Module["_get_rel_namespace"] = (a0) => (_get_rel_namespace = Module["_get_rel_namespace"] = wasmExports["get_rel_namespace"])(a0);
    var _RelnameGetRelid = Module["_RelnameGetRelid"] = (a0) => (_RelnameGetRelid = Module["_RelnameGetRelid"] = wasmExports["RelnameGetRelid"])(a0);
    var _get_relkind_objtype = Module["_get_relkind_objtype"] = (a0) => (_get_relkind_objtype = Module["_get_relkind_objtype"] = wasmExports["get_relkind_objtype"])(a0);
    var _RelationIsVisible = Module["_RelationIsVisible"] = (a0) => (_RelationIsVisible = Module["_RelationIsVisible"] = wasmExports["RelationIsVisible"])(a0);
    var _get_func_arg_info = Module["_get_func_arg_info"] = (a0, a1, a2, a3) => (_get_func_arg_info = Module["_get_func_arg_info"] = wasmExports["get_func_arg_info"])(a0, a1, a2, a3);
    var _NameListToString = Module["_NameListToString"] = (a0) => (_NameListToString = Module["_NameListToString"] = wasmExports["NameListToString"])(a0);
    var _makeRangeVarFromNameList = Module["_makeRangeVarFromNameList"] = (a0) => (_makeRangeVarFromNameList = Module["_makeRangeVarFromNameList"] = wasmExports["makeRangeVarFromNameList"])(a0);
    var _quote_identifier = Module["_quote_identifier"] = (a0) => (_quote_identifier = Module["_quote_identifier"] = wasmExports["quote_identifier"])(a0);
    var _get_collation_oid = Module["_get_collation_oid"] = (a0, a1) => (_get_collation_oid = Module["_get_collation_oid"] = wasmExports["get_collation_oid"])(a0, a1);
    var _CacheRegisterSyscacheCallback = Module["_CacheRegisterSyscacheCallback"] = (a0, a1, a2) => (_CacheRegisterSyscacheCallback = Module["_CacheRegisterSyscacheCallback"] = wasmExports["CacheRegisterSyscacheCallback"])(a0, a1, a2);
    var _get_extension_oid = Module["_get_extension_oid"] = (a0, a1) => (_get_extension_oid = Module["_get_extension_oid"] = wasmExports["get_extension_oid"])(a0, a1);
    var _get_role_oid = Module["_get_role_oid"] = (a0, a1) => (_get_role_oid = Module["_get_role_oid"] = wasmExports["get_role_oid"])(a0, a1);
    var _GetForeignServerByName = Module["_GetForeignServerByName"] = (a0, a1) => (_GetForeignServerByName = Module["_GetForeignServerByName"] = wasmExports["GetForeignServerByName"])(a0, a1);
    var _typeStringToTypeName = Module["_typeStringToTypeName"] = (a0, a1) => (_typeStringToTypeName = Module["_typeStringToTypeName"] = wasmExports["typeStringToTypeName"])(a0, a1);
    var _list_make2_impl = Module["_list_make2_impl"] = (a0, a1, a2) => (_list_make2_impl = Module["_list_make2_impl"] = wasmExports["list_make2_impl"])(a0, a1, a2);
    var _GetUserNameFromId = Module["_GetUserNameFromId"] = (a0, a1) => (_GetUserNameFromId = Module["_GetUserNameFromId"] = wasmExports["GetUserNameFromId"])(a0, a1);
    var _format_type_extended = Module["_format_type_extended"] = (a0, a1, a2) => (_format_type_extended = Module["_format_type_extended"] = wasmExports["format_type_extended"])(a0, a1, a2);
    var _quote_qualified_identifier = Module["_quote_qualified_identifier"] = (a0, a1) => (_quote_qualified_identifier = Module["_quote_qualified_identifier"] = wasmExports["quote_qualified_identifier"])(a0, a1);
    var _GetForeignServerExtended = Module["_GetForeignServerExtended"] = (a0, a1) => (_GetForeignServerExtended = Module["_GetForeignServerExtended"] = wasmExports["GetForeignServerExtended"])(a0, a1);
    var _GetForeignServer = Module["_GetForeignServer"] = (a0) => (_GetForeignServer = Module["_GetForeignServer"] = wasmExports["GetForeignServer"])(a0);
    var _construct_empty_array = Module["_construct_empty_array"] = (a0) => (_construct_empty_array = Module["_construct_empty_array"] = wasmExports["construct_empty_array"])(a0);
    var _get_namespace_name_or_temp = Module["_get_namespace_name_or_temp"] = (a0) => (_get_namespace_name_or_temp = Module["_get_namespace_name_or_temp"] = wasmExports["get_namespace_name_or_temp"])(a0);
    var _list_make3_impl = Module["_list_make3_impl"] = (a0, a1, a2, a3) => (_list_make3_impl = Module["_list_make3_impl"] = wasmExports["list_make3_impl"])(a0, a1, a2, a3);
    var _construct_md_array = Module["_construct_md_array"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (_construct_md_array = Module["_construct_md_array"] = wasmExports["construct_md_array"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
    var _pull_varattnos = Module["_pull_varattnos"] = (a0, a1, a2) => (_pull_varattnos = Module["_pull_varattnos"] = wasmExports["pull_varattnos"])(a0, a1, a2);
    var _construct_array_builtin = Module["_construct_array_builtin"] = (a0, a1, a2) => (_construct_array_builtin = Module["_construct_array_builtin"] = wasmExports["construct_array_builtin"])(a0, a1, a2);
    var _bms_is_subset = Module["_bms_is_subset"] = (a0, a1) => (_bms_is_subset = Module["_bms_is_subset"] = wasmExports["bms_is_subset"])(a0, a1);
    var _getExtensionOfObject = Module["_getExtensionOfObject"] = (a0, a1) => (_getExtensionOfObject = Module["_getExtensionOfObject"] = wasmExports["getExtensionOfObject"])(a0, a1);
    var _lappend_int = Module["_lappend_int"] = (a0, a1) => (_lappend_int = Module["_lappend_int"] = wasmExports["lappend_int"])(a0, a1);
    var _CheckFunctionValidatorAccess = Module["_CheckFunctionValidatorAccess"] = (a0, a1) => (_CheckFunctionValidatorAccess = Module["_CheckFunctionValidatorAccess"] = wasmExports["CheckFunctionValidatorAccess"])(a0, a1);
    var _function_parse_error_transpose = Module["_function_parse_error_transpose"] = (a0) => (_function_parse_error_transpose = Module["_function_parse_error_transpose"] = wasmExports["function_parse_error_transpose"])(a0);
    var _geterrposition = Module["_geterrposition"] = () => (_geterrposition = Module["_geterrposition"] = wasmExports["geterrposition"])();
    var _getinternalerrposition = Module["_getinternalerrposition"] = () => (_getinternalerrposition = Module["_getinternalerrposition"] = wasmExports["getinternalerrposition"])();
    var _pg_mblen = Module["_pg_mblen"] = (a0) => (_pg_mblen = Module["_pg_mblen"] = wasmExports["pg_mblen"])(a0);
    var _pg_mbstrlen_with_len = Module["_pg_mbstrlen_with_len"] = (a0, a1) => (_pg_mbstrlen_with_len = Module["_pg_mbstrlen_with_len"] = wasmExports["pg_mbstrlen_with_len"])(a0, a1);
    var _errposition = Module["_errposition"] = (a0) => (_errposition = Module["_errposition"] = wasmExports["errposition"])(a0);
    var _internalerrposition = Module["_internalerrposition"] = (a0) => (_internalerrposition = Module["_internalerrposition"] = wasmExports["internalerrposition"])(a0);
    var _internalerrquery = Module["_internalerrquery"] = (a0) => (_internalerrquery = Module["_internalerrquery"] = wasmExports["internalerrquery"])(a0);
    var _list_delete_nth_cell = Module["_list_delete_nth_cell"] = (a0, a1) => (_list_delete_nth_cell = Module["_list_delete_nth_cell"] = wasmExports["list_delete_nth_cell"])(a0, a1);
    var _get_array_type = Module["_get_array_type"] = (a0) => (_get_array_type = Module["_get_array_type"] = wasmExports["get_array_type"])(a0);
    var _smgrtruncate2 = Module["_smgrtruncate2"] = (a0, a1, a2, a3, a4) => (_smgrtruncate2 = Module["_smgrtruncate2"] = wasmExports["smgrtruncate2"])(a0, a1, a2, a3, a4);
    var _smgrreadv = Module["_smgrreadv"] = (a0, a1, a2, a3, a4) => (_smgrreadv = Module["_smgrreadv"] = wasmExports["smgrreadv"])(a0, a1, a2, a3, a4);
    var _exprLocation = Module["_exprLocation"] = (a0) => (_exprLocation = Module["_exprLocation"] = wasmExports["exprLocation"])(a0);
    var _makeTargetEntry = Module["_makeTargetEntry"] = (a0, a1, a2, a3) => (_makeTargetEntry = Module["_makeTargetEntry"] = wasmExports["makeTargetEntry"])(a0, a1, a2, a3);
    var _makeVar = Module["_makeVar"] = (a0, a1, a2, a3, a4, a5) => (_makeVar = Module["_makeVar"] = wasmExports["makeVar"])(a0, a1, a2, a3, a4, a5);
    var _makeBoolean = Module["_makeBoolean"] = (a0) => (_makeBoolean = Module["_makeBoolean"] = wasmExports["makeBoolean"])(a0);
    var _makeInteger = Module["_makeInteger"] = (a0) => (_makeInteger = Module["_makeInteger"] = wasmExports["makeInteger"])(a0);
    var _makeTypeName = Module["_makeTypeName"] = (a0) => (_makeTypeName = Module["_makeTypeName"] = wasmExports["makeTypeName"])(a0);
    var _list_make4_impl = Module["_list_make4_impl"] = (a0, a1, a2, a3, a4) => (_list_make4_impl = Module["_list_make4_impl"] = wasmExports["list_make4_impl"])(a0, a1, a2, a3, a4);
    var _list_member_int = Module["_list_member_int"] = (a0, a1) => (_list_member_int = Module["_list_member_int"] = wasmExports["list_member_int"])(a0, a1);
    var _typenameTypeIdAndMod = Module["_typenameTypeIdAndMod"] = (a0, a1, a2, a3) => (_typenameTypeIdAndMod = Module["_typenameTypeIdAndMod"] = wasmExports["typenameTypeIdAndMod"])(a0, a1, a2, a3);
    var _get_typcollation = Module["_get_typcollation"] = (a0) => (_get_typcollation = Module["_get_typcollation"] = wasmExports["get_typcollation"])(a0);
    var _strip_implicit_coercions = Module["_strip_implicit_coercions"] = (a0) => (_strip_implicit_coercions = Module["_strip_implicit_coercions"] = wasmExports["strip_implicit_coercions"])(a0);
    var _get_sortgroupref_tle = Module["_get_sortgroupref_tle"] = (a0, a1) => (_get_sortgroupref_tle = Module["_get_sortgroupref_tle"] = wasmExports["get_sortgroupref_tle"])(a0, a1);
    var _lookup_rowtype_tupdesc = Module["_lookup_rowtype_tupdesc"] = (a0, a1) => (_lookup_rowtype_tupdesc = Module["_lookup_rowtype_tupdesc"] = wasmExports["lookup_rowtype_tupdesc"])(a0, a1);
    var _bms_del_member = Module["_bms_del_member"] = (a0, a1) => (_bms_del_member = Module["_bms_del_member"] = wasmExports["bms_del_member"])(a0, a1);
    var _list_member = Module["_list_member"] = (a0, a1) => (_list_member = Module["_list_member"] = wasmExports["list_member"])(a0, a1);
    var _type_is_rowtype = Module["_type_is_rowtype"] = (a0) => (_type_is_rowtype = Module["_type_is_rowtype"] = wasmExports["type_is_rowtype"])(a0);
    var _bit_in = Module["_bit_in"] = (a0) => (_bit_in = Module["_bit_in"] = wasmExports["bit_in"])(a0);
    var _varstr_levenshtein_less_equal = Module["_varstr_levenshtein_less_equal"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (_varstr_levenshtein_less_equal = Module["_varstr_levenshtein_less_equal"] = wasmExports["varstr_levenshtein_less_equal"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
    var _bms_union = Module["_bms_union"] = (a0, a1) => (_bms_union = Module["_bms_union"] = wasmExports["bms_union"])(a0, a1);
    var _errsave_start = Module["_errsave_start"] = (a0, a1) => (_errsave_start = Module["_errsave_start"] = wasmExports["errsave_start"])(a0, a1);
    var _errsave_finish = Module["_errsave_finish"] = (a0, a1, a2, a3) => (_errsave_finish = Module["_errsave_finish"] = wasmExports["errsave_finish"])(a0, a1, a2, a3);
    var _scanner_init = Module["_scanner_init"] = (a0, a1, a2, a3) => (_scanner_init = Module["_scanner_init"] = wasmExports["scanner_init"])(a0, a1, a2, a3);
    var _scanner_finish = Module["_scanner_finish"] = (a0) => (_scanner_finish = Module["_scanner_finish"] = wasmExports["scanner_finish"])(a0);
    var _core_yylex = Module["_core_yylex"] = (a0, a1, a2) => (_core_yylex = Module["_core_yylex"] = wasmExports["core_yylex"])(a0, a1, a2);
    var _isxdigit = Module["_isxdigit"] = (a0) => (_isxdigit = Module["_isxdigit"] = wasmExports["isxdigit"])(a0);
    var _scanner_isspace = Module["_scanner_isspace"] = (a0) => (_scanner_isspace = Module["_scanner_isspace"] = wasmExports["scanner_isspace"])(a0);
    var _truncate_identifier = Module["_truncate_identifier"] = (a0, a1, a2) => (_truncate_identifier = Module["_truncate_identifier"] = wasmExports["truncate_identifier"])(a0, a1, a2);
    var _downcase_truncate_identifier = Module["_downcase_truncate_identifier"] = (a0, a1, a2) => (_downcase_truncate_identifier = Module["_downcase_truncate_identifier"] = wasmExports["downcase_truncate_identifier"])(a0, a1, a2);
    var _pg_database_encoding_max_length = Module["_pg_database_encoding_max_length"] = () => (_pg_database_encoding_max_length = Module["_pg_database_encoding_max_length"] = wasmExports["pg_database_encoding_max_length"])();
    var _namein = Module["_namein"] = (a0) => (_namein = Module["_namein"] = wasmExports["namein"])(a0);
    var _reservoir_init_selection_state = Module["_reservoir_init_selection_state"] = (a0, a1) => (_reservoir_init_selection_state = Module["_reservoir_init_selection_state"] = wasmExports["reservoir_init_selection_state"])(a0, a1);
    var _reservoir_get_next_S = Module["_reservoir_get_next_S"] = (a0, a1, a2) => (_reservoir_get_next_S = Module["_reservoir_get_next_S"] = wasmExports["reservoir_get_next_S"])(a0, a1, a2);
    var _sampler_random_fract = Module["_sampler_random_fract"] = (a0) => (_sampler_random_fract = Module["_sampler_random_fract"] = wasmExports["sampler_random_fract"])(a0);
    var _Async_Notify = Module["_Async_Notify"] = (a0, a1) => (_Async_Notify = Module["_Async_Notify"] = wasmExports["Async_Notify"])(a0, a1);
    var _wasm_OpenPipeStream = Module["_wasm_OpenPipeStream"] = (a0, a1) => (_wasm_OpenPipeStream = Module["_wasm_OpenPipeStream"] = wasmExports["wasm_OpenPipeStream"])(a0, a1);
    var _ClosePipeStream = Module["_ClosePipeStream"] = (a0) => (_ClosePipeStream = Module["_ClosePipeStream"] = wasmExports["ClosePipeStream"])(a0);
    var _BeginCopyFrom = Module["_BeginCopyFrom"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_BeginCopyFrom = Module["_BeginCopyFrom"] = wasmExports["BeginCopyFrom"])(a0, a1, a2, a3, a4, a5, a6, a7);
    var _EndCopyFrom = Module["_EndCopyFrom"] = (a0) => (_EndCopyFrom = Module["_EndCopyFrom"] = wasmExports["EndCopyFrom"])(a0);
    var _ProcessCopyOptions = Module["_ProcessCopyOptions"] = (a0, a1, a2, a3) => (_ProcessCopyOptions = Module["_ProcessCopyOptions"] = wasmExports["ProcessCopyOptions"])(a0, a1, a2, a3);
    var _CopyFromErrorCallback = Module["_CopyFromErrorCallback"] = (a0) => (_CopyFromErrorCallback = Module["_CopyFromErrorCallback"] = wasmExports["CopyFromErrorCallback"])(a0);
    var _NextCopyFrom = Module["_NextCopyFrom"] = (a0, a1, a2, a3) => (_NextCopyFrom = Module["_NextCopyFrom"] = wasmExports["NextCopyFrom"])(a0, a1, a2, a3);
    var _ExecInitExpr = Module["_ExecInitExpr"] = (a0, a1) => (_ExecInitExpr = Module["_ExecInitExpr"] = wasmExports["ExecInitExpr"])(a0, a1);
    var _tolower = Module["_tolower"] = (a0) => (_tolower = Module["_tolower"] = wasmExports["tolower"])(a0);
    var _pg_server_to_any = Module["_pg_server_to_any"] = (a0, a1, a2) => (_pg_server_to_any = Module["_pg_server_to_any"] = wasmExports["pg_server_to_any"])(a0, a1, a2);
    var _GetCommandTagName = Module["_GetCommandTagName"] = (a0) => (_GetCommandTagName = Module["_GetCommandTagName"] = wasmExports["GetCommandTagName"])(a0);
    var _NewExplainState = Module["_NewExplainState"] = () => (_NewExplainState = Module["_NewExplainState"] = wasmExports["NewExplainState"])();
    var _ExplainBeginOutput = Module["_ExplainBeginOutput"] = (a0) => (_ExplainBeginOutput = Module["_ExplainBeginOutput"] = wasmExports["ExplainBeginOutput"])(a0);
    var _ExplainEndOutput = Module["_ExplainEndOutput"] = (a0) => (_ExplainEndOutput = Module["_ExplainEndOutput"] = wasmExports["ExplainEndOutput"])(a0);
    var _ExplainPrintPlan = Module["_ExplainPrintPlan"] = (a0, a1) => (_ExplainPrintPlan = Module["_ExplainPrintPlan"] = wasmExports["ExplainPrintPlan"])(a0, a1);
    var _ExplainPropertyInteger = Module["_ExplainPropertyInteger"] = (a0, a1, a2, a3) => (_ExplainPropertyInteger = Module["_ExplainPropertyInteger"] = wasmExports["ExplainPropertyInteger"])(a0, a1, a2, a3);
    var _ExplainPrintTriggers = Module["_ExplainPrintTriggers"] = (a0, a1) => (_ExplainPrintTriggers = Module["_ExplainPrintTriggers"] = wasmExports["ExplainPrintTriggers"])(a0, a1);
    var _ExplainPrintJITSummary = Module["_ExplainPrintJITSummary"] = (a0, a1) => (_ExplainPrintJITSummary = Module["_ExplainPrintJITSummary"] = wasmExports["ExplainPrintJITSummary"])(a0, a1);
    var _ExplainPropertyText = Module["_ExplainPropertyText"] = (a0, a1, a2) => (_ExplainPropertyText = Module["_ExplainPropertyText"] = wasmExports["ExplainPropertyText"])(a0, a1, a2);
    var _InstrEndLoop = Module["_InstrEndLoop"] = (a0) => (_InstrEndLoop = Module["_InstrEndLoop"] = wasmExports["InstrEndLoop"])(a0);
    var _ExplainQueryText = Module["_ExplainQueryText"] = (a0, a1) => (_ExplainQueryText = Module["_ExplainQueryText"] = wasmExports["ExplainQueryText"])(a0, a1);
    var _ExplainQueryParameters = Module["_ExplainQueryParameters"] = (a0, a1, a2) => (_ExplainQueryParameters = Module["_ExplainQueryParameters"] = wasmExports["ExplainQueryParameters"])(a0, a1, a2);
    var _get_func_namespace = Module["_get_func_namespace"] = (a0) => (_get_func_namespace = Module["_get_func_namespace"] = wasmExports["get_func_namespace"])(a0);
    var _get_rel_type_id = Module["_get_rel_type_id"] = (a0) => (_get_rel_type_id = Module["_get_rel_type_id"] = wasmExports["get_rel_type_id"])(a0);
    var _set_config_option = Module["_set_config_option"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_set_config_option = Module["_set_config_option"] = wasmExports["set_config_option"])(a0, a1, a2, a3, a4, a5, a6, a7);
    var _pg_any_to_server = Module["_pg_any_to_server"] = (a0, a1, a2) => (_pg_any_to_server = Module["_pg_any_to_server"] = wasmExports["pg_any_to_server"])(a0, a1, a2);
    var _DirectFunctionCall4Coll = Module["_DirectFunctionCall4Coll"] = (a0, a1, a2, a3, a4, a5) => (_DirectFunctionCall4Coll = Module["_DirectFunctionCall4Coll"] = wasmExports["DirectFunctionCall4Coll"])(a0, a1, a2, a3, a4, a5);
    var _GetForeignDataWrapper = Module["_GetForeignDataWrapper"] = (a0) => (_GetForeignDataWrapper = Module["_GetForeignDataWrapper"] = wasmExports["GetForeignDataWrapper"])(a0);
    var _CreateExprContext = Module["_CreateExprContext"] = (a0) => (_CreateExprContext = Module["_CreateExprContext"] = wasmExports["CreateExprContext"])(a0);
    var _EnsurePortalSnapshotExists = Module["_EnsurePortalSnapshotExists"] = () => (_EnsurePortalSnapshotExists = Module["_EnsurePortalSnapshotExists"] = wasmExports["EnsurePortalSnapshotExists"])();
    var _SPI_connect = Module["_SPI_connect"] = () => (_SPI_connect = Module["_SPI_connect"] = wasmExports["SPI_connect"])();
    var _SPI_exec = Module["_SPI_exec"] = (a0, a1) => (_SPI_exec = Module["_SPI_exec"] = wasmExports["SPI_exec"])(a0, a1);
    var _SPI_execute = Module["_SPI_execute"] = (a0, a1, a2) => (_SPI_execute = Module["_SPI_execute"] = wasmExports["SPI_execute"])(a0, a1, a2);
    var _SPI_getvalue = Module["_SPI_getvalue"] = (a0, a1, a2) => (_SPI_getvalue = Module["_SPI_getvalue"] = wasmExports["SPI_getvalue"])(a0, a1, a2);
    var _SPI_finish = Module["_SPI_finish"] = () => (_SPI_finish = Module["_SPI_finish"] = wasmExports["SPI_finish"])();
    var _MemoryContextSetIdentifier = Module["_MemoryContextSetIdentifier"] = (a0, a1) => (_MemoryContextSetIdentifier = Module["_MemoryContextSetIdentifier"] = wasmExports["MemoryContextSetIdentifier"])(a0, a1);
    var _SetTuplestoreDestReceiverParams = Module["_SetTuplestoreDestReceiverParams"] = (a0, a1, a2, a3, a4, a5) => (_SetTuplestoreDestReceiverParams = Module["_SetTuplestoreDestReceiverParams"] = wasmExports["SetTuplestoreDestReceiverParams"])(a0, a1, a2, a3, a4, a5);
    var _MemoryContextDeleteChildren = Module["_MemoryContextDeleteChildren"] = (a0) => (_MemoryContextDeleteChildren = Module["_MemoryContextDeleteChildren"] = wasmExports["MemoryContextDeleteChildren"])(a0);
    var _ReleaseCachedPlan = Module["_ReleaseCachedPlan"] = (a0, a1) => (_ReleaseCachedPlan = Module["_ReleaseCachedPlan"] = wasmExports["ReleaseCachedPlan"])(a0, a1);
    var _nextval = Module["_nextval"] = (a0) => (_nextval = Module["_nextval"] = wasmExports["nextval"])(a0);
    var _textToQualifiedNameList = Module["_textToQualifiedNameList"] = (a0) => (_textToQualifiedNameList = Module["_textToQualifiedNameList"] = wasmExports["textToQualifiedNameList"])(a0);
    var _list_delete = Module["_list_delete"] = (a0, a1) => (_list_delete = Module["_list_delete"] = wasmExports["list_delete"])(a0, a1);
    var _tuplestore_end = Module["_tuplestore_end"] = (a0) => (_tuplestore_end = Module["_tuplestore_end"] = wasmExports["tuplestore_end"])(a0);
    var _quote_literal_cstr = Module["_quote_literal_cstr"] = (a0) => (_quote_literal_cstr = Module["_quote_literal_cstr"] = wasmExports["quote_literal_cstr"])(a0);
    var _contain_mutable_functions = Module["_contain_mutable_functions"] = (a0) => (_contain_mutable_functions = Module["_contain_mutable_functions"] = wasmExports["contain_mutable_functions"])(a0);
    var _bms_make_singleton = Module["_bms_make_singleton"] = (a0) => (_bms_make_singleton = Module["_bms_make_singleton"] = wasmExports["bms_make_singleton"])(a0);
    var _ExecForceStoreHeapTuple = Module["_ExecForceStoreHeapTuple"] = (a0, a1, a2) => (_ExecForceStoreHeapTuple = Module["_ExecForceStoreHeapTuple"] = wasmExports["ExecForceStoreHeapTuple"])(a0, a1, a2);
    var _tuplestore_begin_heap = Module["_tuplestore_begin_heap"] = (a0, a1, a2) => (_tuplestore_begin_heap = Module["_tuplestore_begin_heap"] = wasmExports["tuplestore_begin_heap"])(a0, a1, a2);
    var _strtod = Module["_strtod"] = (a0, a1) => (_strtod = Module["_strtod"] = wasmExports["strtod"])(a0, a1);
    var _plain_crypt_verify = Module["_plain_crypt_verify"] = (a0, a1, a2, a3) => (_plain_crypt_verify = Module["_plain_crypt_verify"] = wasmExports["plain_crypt_verify"])(a0, a1, a2, a3);
    var _ProcessConfigFile = Module["_ProcessConfigFile"] = (a0) => (_ProcessConfigFile = Module["_ProcessConfigFile"] = wasmExports["ProcessConfigFile"])(a0);
    var _ExecReScan = Module["_ExecReScan"] = (a0) => (_ExecReScan = Module["_ExecReScan"] = wasmExports["ExecReScan"])(a0);
    var _ExecAsyncResponse = Module["_ExecAsyncResponse"] = (a0) => (_ExecAsyncResponse = Module["_ExecAsyncResponse"] = wasmExports["ExecAsyncResponse"])(a0);
    var _ExecAsyncRequestDone = Module["_ExecAsyncRequestDone"] = (a0, a1) => (_ExecAsyncRequestDone = Module["_ExecAsyncRequestDone"] = wasmExports["ExecAsyncRequestDone"])(a0, a1);
    var _ExecAsyncRequestPending = Module["_ExecAsyncRequestPending"] = (a0) => (_ExecAsyncRequestPending = Module["_ExecAsyncRequestPending"] = wasmExports["ExecAsyncRequestPending"])(a0);
    var _ExprEvalPushStep = Module["_ExprEvalPushStep"] = (a0, a1) => (_ExprEvalPushStep = Module["_ExprEvalPushStep"] = wasmExports["ExprEvalPushStep"])(a0, a1);
    var _ExecInitExprList = Module["_ExecInitExprList"] = (a0, a1) => (_ExecInitExprList = Module["_ExecInitExprList"] = wasmExports["ExecInitExprList"])(a0, a1);
    var _ExecInitExprWithParams = Module["_ExecInitExprWithParams"] = (a0, a1) => (_ExecInitExprWithParams = Module["_ExecInitExprWithParams"] = wasmExports["ExecInitExprWithParams"])(a0, a1);
    var _MakeExpandedObjectReadOnlyInternal = Module["_MakeExpandedObjectReadOnlyInternal"] = (a0) => (_MakeExpandedObjectReadOnlyInternal = Module["_MakeExpandedObjectReadOnlyInternal"] = wasmExports["MakeExpandedObjectReadOnlyInternal"])(a0);
    var _ArrayGetNItems = Module["_ArrayGetNItems"] = (a0, a1) => (_ArrayGetNItems = Module["_ArrayGetNItems"] = wasmExports["ArrayGetNItems"])(a0, a1);
    var _expanded_record_fetch_tupdesc = Module["_expanded_record_fetch_tupdesc"] = (a0) => (_expanded_record_fetch_tupdesc = Module["_expanded_record_fetch_tupdesc"] = wasmExports["expanded_record_fetch_tupdesc"])(a0);
    var _expanded_record_fetch_field = Module["_expanded_record_fetch_field"] = (a0, a1, a2) => (_expanded_record_fetch_field = Module["_expanded_record_fetch_field"] = wasmExports["expanded_record_fetch_field"])(a0, a1, a2);
    var _JsonbValueToJsonb = Module["_JsonbValueToJsonb"] = (a0) => (_JsonbValueToJsonb = Module["_JsonbValueToJsonb"] = wasmExports["JsonbValueToJsonb"])(a0);
    var _lookup_rowtype_tupdesc_domain = Module["_lookup_rowtype_tupdesc_domain"] = (a0, a1, a2) => (_lookup_rowtype_tupdesc_domain = Module["_lookup_rowtype_tupdesc_domain"] = wasmExports["lookup_rowtype_tupdesc_domain"])(a0, a1, a2);
    var _MemoryContextGetParent = Module["_MemoryContextGetParent"] = (a0) => (_MemoryContextGetParent = Module["_MemoryContextGetParent"] = wasmExports["MemoryContextGetParent"])(a0);
    var _DeleteExpandedObject = Module["_DeleteExpandedObject"] = (a0) => (_DeleteExpandedObject = Module["_DeleteExpandedObject"] = wasmExports["DeleteExpandedObject"])(a0);
    var _ExecFindJunkAttributeInTlist = Module["_ExecFindJunkAttributeInTlist"] = (a0, a1) => (_ExecFindJunkAttributeInTlist = Module["_ExecFindJunkAttributeInTlist"] = wasmExports["ExecFindJunkAttributeInTlist"])(a0, a1);
    var _standard_ExecutorStart = Module["_standard_ExecutorStart"] = (a0, a1) => (_standard_ExecutorStart = Module["_standard_ExecutorStart"] = wasmExports["standard_ExecutorStart"])(a0, a1);
    var _standard_ExecutorRun = Module["_standard_ExecutorRun"] = (a0, a1, a2, a3) => (_standard_ExecutorRun = Module["_standard_ExecutorRun"] = wasmExports["standard_ExecutorRun"])(a0, a1, a2, a3);
    var _standard_ExecutorFinish = Module["_standard_ExecutorFinish"] = (a0) => (_standard_ExecutorFinish = Module["_standard_ExecutorFinish"] = wasmExports["standard_ExecutorFinish"])(a0);
    var _standard_ExecutorEnd = Module["_standard_ExecutorEnd"] = (a0) => (_standard_ExecutorEnd = Module["_standard_ExecutorEnd"] = wasmExports["standard_ExecutorEnd"])(a0);
    var _InstrAlloc = Module["_InstrAlloc"] = (a0, a1, a2) => (_InstrAlloc = Module["_InstrAlloc"] = wasmExports["InstrAlloc"])(a0, a1, a2);
    var _get_typlenbyval = Module["_get_typlenbyval"] = (a0, a1, a2) => (_get_typlenbyval = Module["_get_typlenbyval"] = wasmExports["get_typlenbyval"])(a0, a1, a2);
    var _InputFunctionCall = Module["_InputFunctionCall"] = (a0, a1, a2, a3) => (_InputFunctionCall = Module["_InputFunctionCall"] = wasmExports["InputFunctionCall"])(a0, a1, a2, a3);
    var _FreeExprContext = Module["_FreeExprContext"] = (a0, a1) => (_FreeExprContext = Module["_FreeExprContext"] = wasmExports["FreeExprContext"])(a0, a1);
    var _ExecOpenScanRelation = Module["_ExecOpenScanRelation"] = (a0, a1, a2) => (_ExecOpenScanRelation = Module["_ExecOpenScanRelation"] = wasmExports["ExecOpenScanRelation"])(a0, a1, a2);
    var _bms_intersect = Module["_bms_intersect"] = (a0, a1) => (_bms_intersect = Module["_bms_intersect"] = wasmExports["bms_intersect"])(a0, a1);
    var _ExecGetReturningSlot = Module["_ExecGetReturningSlot"] = (a0, a1) => (_ExecGetReturningSlot = Module["_ExecGetReturningSlot"] = wasmExports["ExecGetReturningSlot"])(a0, a1);
    var _ExecGetResultRelCheckAsUser = Module["_ExecGetResultRelCheckAsUser"] = (a0, a1) => (_ExecGetResultRelCheckAsUser = Module["_ExecGetResultRelCheckAsUser"] = wasmExports["ExecGetResultRelCheckAsUser"])(a0, a1);
    var _get_call_expr_argtype = Module["_get_call_expr_argtype"] = (a0, a1) => (_get_call_expr_argtype = Module["_get_call_expr_argtype"] = wasmExports["get_call_expr_argtype"])(a0, a1);
    var _InstrUpdateTupleCount = Module["_InstrUpdateTupleCount"] = (a0, a1) => (_InstrUpdateTupleCount = Module["_InstrUpdateTupleCount"] = wasmExports["InstrUpdateTupleCount"])(a0, a1);
    var _AddWaitEventToSet = Module["_AddWaitEventToSet"] = (a0, a1, a2, a3, a4) => (_AddWaitEventToSet = Module["_AddWaitEventToSet"] = wasmExports["AddWaitEventToSet"])(a0, a1, a2, a3, a4);
    var _GetNumRegisteredWaitEvents = Module["_GetNumRegisteredWaitEvents"] = (a0) => (_GetNumRegisteredWaitEvents = Module["_GetNumRegisteredWaitEvents"] = wasmExports["GetNumRegisteredWaitEvents"])(a0);
    var _get_attstatsslot = Module["_get_attstatsslot"] = (a0, a1, a2, a3, a4) => (_get_attstatsslot = Module["_get_attstatsslot"] = wasmExports["get_attstatsslot"])(a0, a1, a2, a3, a4);
    var _free_attstatsslot = Module["_free_attstatsslot"] = (a0) => (_free_attstatsslot = Module["_free_attstatsslot"] = wasmExports["free_attstatsslot"])(a0);
    var _bms_nonempty_difference = Module["_bms_nonempty_difference"] = (a0, a1) => (_bms_nonempty_difference = Module["_bms_nonempty_difference"] = wasmExports["bms_nonempty_difference"])(a0, a1);
    var _SPI_connect_ext = Module["_SPI_connect_ext"] = (a0) => (_SPI_connect_ext = Module["_SPI_connect_ext"] = wasmExports["SPI_connect_ext"])(a0);
    var _SPI_commit = Module["_SPI_commit"] = () => (_SPI_commit = Module["_SPI_commit"] = wasmExports["SPI_commit"])();
    var _CopyErrorData = Module["_CopyErrorData"] = () => (_CopyErrorData = Module["_CopyErrorData"] = wasmExports["CopyErrorData"])();
    var _ReThrowError = Module["_ReThrowError"] = (a0) => (_ReThrowError = Module["_ReThrowError"] = wasmExports["ReThrowError"])(a0);
    var _SPI_commit_and_chain = Module["_SPI_commit_and_chain"] = () => (_SPI_commit_and_chain = Module["_SPI_commit_and_chain"] = wasmExports["SPI_commit_and_chain"])();
    var _SPI_rollback = Module["_SPI_rollback"] = () => (_SPI_rollback = Module["_SPI_rollback"] = wasmExports["SPI_rollback"])();
    var _SPI_rollback_and_chain = Module["_SPI_rollback_and_chain"] = () => (_SPI_rollback_and_chain = Module["_SPI_rollback_and_chain"] = wasmExports["SPI_rollback_and_chain"])();
    var _SPI_freetuptable = Module["_SPI_freetuptable"] = (a0) => (_SPI_freetuptable = Module["_SPI_freetuptable"] = wasmExports["SPI_freetuptable"])(a0);
    var _SPI_execute_extended = Module["_SPI_execute_extended"] = (a0, a1) => (_SPI_execute_extended = Module["_SPI_execute_extended"] = wasmExports["SPI_execute_extended"])(a0, a1);
    var _SPI_execp = Module["_SPI_execp"] = (a0, a1, a2, a3) => (_SPI_execp = Module["_SPI_execp"] = wasmExports["SPI_execp"])(a0, a1, a2, a3);
    var _SPI_execute_plan_extended = Module["_SPI_execute_plan_extended"] = (a0, a1) => (_SPI_execute_plan_extended = Module["_SPI_execute_plan_extended"] = wasmExports["SPI_execute_plan_extended"])(a0, a1);
    var _SPI_execute_plan_with_paramlist = Module["_SPI_execute_plan_with_paramlist"] = (a0, a1, a2, a3) => (_SPI_execute_plan_with_paramlist = Module["_SPI_execute_plan_with_paramlist"] = wasmExports["SPI_execute_plan_with_paramlist"])(a0, a1, a2, a3);
    var _SPI_prepare = Module["_SPI_prepare"] = (a0, a1, a2) => (_SPI_prepare = Module["_SPI_prepare"] = wasmExports["SPI_prepare"])(a0, a1, a2);
    var _SPI_prepare_extended = Module["_SPI_prepare_extended"] = (a0, a1) => (_SPI_prepare_extended = Module["_SPI_prepare_extended"] = wasmExports["SPI_prepare_extended"])(a0, a1);
    var _SPI_keepplan = Module["_SPI_keepplan"] = (a0) => (_SPI_keepplan = Module["_SPI_keepplan"] = wasmExports["SPI_keepplan"])(a0);
    var _SPI_freeplan = Module["_SPI_freeplan"] = (a0) => (_SPI_freeplan = Module["_SPI_freeplan"] = wasmExports["SPI_freeplan"])(a0);
    var _SPI_copytuple = Module["_SPI_copytuple"] = (a0) => (_SPI_copytuple = Module["_SPI_copytuple"] = wasmExports["SPI_copytuple"])(a0);
    var _SPI_returntuple = Module["_SPI_returntuple"] = (a0, a1) => (_SPI_returntuple = Module["_SPI_returntuple"] = wasmExports["SPI_returntuple"])(a0, a1);
    var _SPI_fnumber = Module["_SPI_fnumber"] = (a0, a1) => (_SPI_fnumber = Module["_SPI_fnumber"] = wasmExports["SPI_fnumber"])(a0, a1);
    var _SPI_fname = Module["_SPI_fname"] = (a0, a1) => (_SPI_fname = Module["_SPI_fname"] = wasmExports["SPI_fname"])(a0, a1);
    var _SPI_getbinval = Module["_SPI_getbinval"] = (a0, a1, a2, a3) => (_SPI_getbinval = Module["_SPI_getbinval"] = wasmExports["SPI_getbinval"])(a0, a1, a2, a3);
    var _SPI_gettype = Module["_SPI_gettype"] = (a0, a1) => (_SPI_gettype = Module["_SPI_gettype"] = wasmExports["SPI_gettype"])(a0, a1);
    var _SPI_gettypeid = Module["_SPI_gettypeid"] = (a0, a1) => (_SPI_gettypeid = Module["_SPI_gettypeid"] = wasmExports["SPI_gettypeid"])(a0, a1);
    var _SPI_getrelname = Module["_SPI_getrelname"] = (a0) => (_SPI_getrelname = Module["_SPI_getrelname"] = wasmExports["SPI_getrelname"])(a0);
    var _SPI_palloc = Module["_SPI_palloc"] = (a0) => (_SPI_palloc = Module["_SPI_palloc"] = wasmExports["SPI_palloc"])(a0);
    var _SPI_datumTransfer = Module["_SPI_datumTransfer"] = (a0, a1, a2) => (_SPI_datumTransfer = Module["_SPI_datumTransfer"] = wasmExports["SPI_datumTransfer"])(a0, a1, a2);
    var _datumTransfer = Module["_datumTransfer"] = (a0, a1, a2) => (_datumTransfer = Module["_datumTransfer"] = wasmExports["datumTransfer"])(a0, a1, a2);
    var _SPI_cursor_open_with_paramlist = Module["_SPI_cursor_open_with_paramlist"] = (a0, a1, a2, a3) => (_SPI_cursor_open_with_paramlist = Module["_SPI_cursor_open_with_paramlist"] = wasmExports["SPI_cursor_open_with_paramlist"])(a0, a1, a2, a3);
    var _SPI_cursor_parse_open = Module["_SPI_cursor_parse_open"] = (a0, a1, a2) => (_SPI_cursor_parse_open = Module["_SPI_cursor_parse_open"] = wasmExports["SPI_cursor_parse_open"])(a0, a1, a2);
    var _SPI_cursor_find = Module["_SPI_cursor_find"] = (a0) => (_SPI_cursor_find = Module["_SPI_cursor_find"] = wasmExports["SPI_cursor_find"])(a0);
    var _SPI_cursor_fetch = Module["_SPI_cursor_fetch"] = (a0, a1, a2) => (_SPI_cursor_fetch = Module["_SPI_cursor_fetch"] = wasmExports["SPI_cursor_fetch"])(a0, a1, a2);
    var _SPI_scroll_cursor_fetch = Module["_SPI_scroll_cursor_fetch"] = (a0, a1, a2) => (_SPI_scroll_cursor_fetch = Module["_SPI_scroll_cursor_fetch"] = wasmExports["SPI_scroll_cursor_fetch"])(a0, a1, a2);
    var _SPI_scroll_cursor_move = Module["_SPI_scroll_cursor_move"] = (a0, a1, a2) => (_SPI_scroll_cursor_move = Module["_SPI_scroll_cursor_move"] = wasmExports["SPI_scroll_cursor_move"])(a0, a1, a2);
    var _SPI_cursor_close = Module["_SPI_cursor_close"] = (a0) => (_SPI_cursor_close = Module["_SPI_cursor_close"] = wasmExports["SPI_cursor_close"])(a0);
    var _SPI_result_code_string = Module["_SPI_result_code_string"] = (a0) => (_SPI_result_code_string = Module["_SPI_result_code_string"] = wasmExports["SPI_result_code_string"])(a0);
    var _SPI_plan_get_plan_sources = Module["_SPI_plan_get_plan_sources"] = (a0) => (_SPI_plan_get_plan_sources = Module["_SPI_plan_get_plan_sources"] = wasmExports["SPI_plan_get_plan_sources"])(a0);
    var _SPI_plan_get_cached_plan = Module["_SPI_plan_get_cached_plan"] = (a0) => (_SPI_plan_get_cached_plan = Module["_SPI_plan_get_cached_plan"] = wasmExports["SPI_plan_get_cached_plan"])(a0);
    var _SPI_register_trigger_data = Module["_SPI_register_trigger_data"] = (a0) => (_SPI_register_trigger_data = Module["_SPI_register_trigger_data"] = wasmExports["SPI_register_trigger_data"])(a0);
    var _tuplestore_tuple_count = Module["_tuplestore_tuple_count"] = (a0) => (_tuplestore_tuple_count = Module["_tuplestore_tuple_count"] = wasmExports["tuplestore_tuple_count"])(a0);
    var _GetUserMapping = Module["_GetUserMapping"] = (a0, a1) => (_GetUserMapping = Module["_GetUserMapping"] = wasmExports["GetUserMapping"])(a0, a1);
    var _GetForeignTable = Module["_GetForeignTable"] = (a0) => (_GetForeignTable = Module["_GetForeignTable"] = wasmExports["GetForeignTable"])(a0);
    var _GetForeignColumnOptions = Module["_GetForeignColumnOptions"] = (a0, a1) => (_GetForeignColumnOptions = Module["_GetForeignColumnOptions"] = wasmExports["GetForeignColumnOptions"])(a0, a1);
    var _initClosestMatch = Module["_initClosestMatch"] = (a0, a1, a2) => (_initClosestMatch = Module["_initClosestMatch"] = wasmExports["initClosestMatch"])(a0, a1, a2);
    var _updateClosestMatch = Module["_updateClosestMatch"] = (a0, a1) => (_updateClosestMatch = Module["_updateClosestMatch"] = wasmExports["updateClosestMatch"])(a0, a1);
    var _getClosestMatch = Module["_getClosestMatch"] = (a0) => (_getClosestMatch = Module["_getClosestMatch"] = wasmExports["getClosestMatch"])(a0);
    var _GetExistingLocalJoinPath = Module["_GetExistingLocalJoinPath"] = (a0) => (_GetExistingLocalJoinPath = Module["_GetExistingLocalJoinPath"] = wasmExports["GetExistingLocalJoinPath"])(a0);
    var _bloom_create = Module["_bloom_create"] = (a0, a1, a2) => (_bloom_create = Module["_bloom_create"] = wasmExports["bloom_create"])(a0, a1, a2);
    var _bloom_free = Module["_bloom_free"] = (a0) => (_bloom_free = Module["_bloom_free"] = wasmExports["bloom_free"])(a0);
    var _bloom_add_element = Module["_bloom_add_element"] = (a0, a1, a2) => (_bloom_add_element = Module["_bloom_add_element"] = wasmExports["bloom_add_element"])(a0, a1, a2);
    var _bloom_lacks_element = Module["_bloom_lacks_element"] = (a0, a1, a2) => (_bloom_lacks_element = Module["_bloom_lacks_element"] = wasmExports["bloom_lacks_element"])(a0, a1, a2);
    var _bloom_prop_bits_set = Module["_bloom_prop_bits_set"] = (a0) => (_bloom_prop_bits_set = Module["_bloom_prop_bits_set"] = wasmExports["bloom_prop_bits_set"])(a0);
    var _gai_strerror = Module["_gai_strerror"] = (a0) => (_gai_strerror = Module["_gai_strerror"] = wasmExports["gai_strerror"])(a0);
    var _socket = Module["_socket"] = (a0, a1, a2) => (_socket = Module["_socket"] = wasmExports["socket"])(a0, a1, a2);
    var _connect = Module["_connect"] = (a0, a1, a2) => (_connect = Module["_connect"] = wasmExports["connect"])(a0, a1, a2);
    var _send = Module["_send"] = (a0, a1, a2, a3) => (_send = Module["_send"] = wasmExports["send"])(a0, a1, a2, a3);
    var _recv = Module["_recv"] = (a0, a1, a2, a3) => (_recv = Module["_recv"] = wasmExports["recv"])(a0, a1, a2, a3);
    var _be_lo_unlink = Module["_be_lo_unlink"] = (a0) => (_be_lo_unlink = Module["_be_lo_unlink"] = wasmExports["be_lo_unlink"])(a0);
    var _text_to_cstring_buffer = Module["_text_to_cstring_buffer"] = (a0, a1, a2) => (_text_to_cstring_buffer = Module["_text_to_cstring_buffer"] = wasmExports["text_to_cstring_buffer"])(a0, a1, a2);
    var _pglite_callbacks_ready = Module["_pglite_callbacks_ready"] = () => (_pglite_callbacks_ready = Module["_pglite_callbacks_ready"] = wasmExports["pglite_callbacks_ready"])();
    var _set_read_write_cbs = Module["_set_read_write_cbs"] = (a0, a1) => (_set_read_write_cbs = Module["_set_read_write_cbs"] = wasmExports["set_read_write_cbs"])(a0, a1);
    var _setsockopt = Module["_setsockopt"] = (a0, a1, a2, a3, a4) => (_setsockopt = Module["_setsockopt"] = wasmExports["setsockopt"])(a0, a1, a2, a3, a4);
    var _getsockopt = Module["_getsockopt"] = (a0, a1, a2, a3, a4) => (_getsockopt = Module["_getsockopt"] = wasmExports["getsockopt"])(a0, a1, a2, a3, a4);
    var _getsockname = Module["_getsockname"] = (a0, a1, a2) => (_getsockname = Module["_getsockname"] = wasmExports["getsockname"])(a0, a1, a2);
    var _poll = Module["_poll"] = (a0, a1, a2) => (_poll = Module["_poll"] = wasmExports["poll"])(a0, a1, a2);
    var _pg_mb2wchar_with_len = Module["_pg_mb2wchar_with_len"] = (a0, a1, a2) => (_pg_mb2wchar_with_len = Module["_pg_mb2wchar_with_len"] = wasmExports["pg_mb2wchar_with_len"])(a0, a1, a2);
    var _pg_regcomp = Module["_pg_regcomp"] = (a0, a1, a2, a3, a4) => (_pg_regcomp = Module["_pg_regcomp"] = wasmExports["pg_regcomp"])(a0, a1, a2, a3, a4);
    var _pg_regerror = Module["_pg_regerror"] = (a0, a1, a2, a3) => (_pg_regerror = Module["_pg_regerror"] = wasmExports["pg_regerror"])(a0, a1, a2, a3);
    var _strcat = Module["_strcat"] = (a0, a1) => (_strcat = Module["_strcat"] = wasmExports["strcat"])(a0, a1);
    var _pq_sendtext = Module["_pq_sendtext"] = (a0, a1, a2) => (_pq_sendtext = Module["_pq_sendtext"] = wasmExports["pq_sendtext"])(a0, a1, a2);
    var _pq_sendfloat8 = Module["_pq_sendfloat8"] = (a0, a1) => (_pq_sendfloat8 = Module["_pq_sendfloat8"] = wasmExports["pq_sendfloat8"])(a0, a1);
    var _pq_begintypsend = Module["_pq_begintypsend"] = (a0) => (_pq_begintypsend = Module["_pq_begintypsend"] = wasmExports["pq_begintypsend"])(a0);
    var _pq_endtypsend = Module["_pq_endtypsend"] = (a0) => (_pq_endtypsend = Module["_pq_endtypsend"] = wasmExports["pq_endtypsend"])(a0);
    var _pq_getmsgfloat8 = Module["_pq_getmsgfloat8"] = (a0) => (_pq_getmsgfloat8 = Module["_pq_getmsgfloat8"] = wasmExports["pq_getmsgfloat8"])(a0);
    var _pq_getmsgtext = Module["_pq_getmsgtext"] = (a0, a1, a2) => (_pq_getmsgtext = Module["_pq_getmsgtext"] = wasmExports["pq_getmsgtext"])(a0, a1, a2);
    var _pg_strtoint32 = Module["_pg_strtoint32"] = (a0) => (_pg_strtoint32 = Module["_pg_strtoint32"] = wasmExports["pg_strtoint32"])(a0);
    var _bms_membership = Module["_bms_membership"] = (a0) => (_bms_membership = Module["_bms_membership"] = wasmExports["bms_membership"])(a0);
    var _list_make5_impl = Module["_list_make5_impl"] = (a0, a1, a2, a3, a4, a5) => (_list_make5_impl = Module["_list_make5_impl"] = wasmExports["list_make5_impl"])(a0, a1, a2, a3, a4, a5);
    var _list_member_ptr = Module["_list_member_ptr"] = (a0, a1) => (_list_member_ptr = Module["_list_member_ptr"] = wasmExports["list_member_ptr"])(a0, a1);
    var _list_append_unique_ptr = Module["_list_append_unique_ptr"] = (a0, a1) => (_list_append_unique_ptr = Module["_list_append_unique_ptr"] = wasmExports["list_append_unique_ptr"])(a0, a1);
    var _exprIsLengthCoercion = Module["_exprIsLengthCoercion"] = (a0, a1) => (_exprIsLengthCoercion = Module["_exprIsLengthCoercion"] = wasmExports["exprIsLengthCoercion"])(a0, a1);
    var _CleanQuerytext = Module["_CleanQuerytext"] = (a0, a1, a2) => (_CleanQuerytext = Module["_CleanQuerytext"] = wasmExports["CleanQuerytext"])(a0, a1, a2);
    var _EnableQueryId = Module["_EnableQueryId"] = () => (_EnableQueryId = Module["_EnableQueryId"] = wasmExports["EnableQueryId"])();
    var _find_base_rel = Module["_find_base_rel"] = (a0, a1) => (_find_base_rel = Module["_find_base_rel"] = wasmExports["find_base_rel"])(a0, a1);
    var _add_path = Module["_add_path"] = (a0, a1) => (_add_path = Module["_add_path"] = wasmExports["add_path"])(a0, a1);
    var _pathkeys_contained_in = Module["_pathkeys_contained_in"] = (a0, a1) => (_pathkeys_contained_in = Module["_pathkeys_contained_in"] = wasmExports["pathkeys_contained_in"])(a0, a1);
    var _create_sort_path = Module["_create_sort_path"] = (a0, a1, a2, a3, a4) => (_create_sort_path = Module["_create_sort_path"] = wasmExports["create_sort_path"])(a0, a1, a2, a3, a4);
    var _set_baserel_size_estimates = Module["_set_baserel_size_estimates"] = (a0, a1) => (_set_baserel_size_estimates = Module["_set_baserel_size_estimates"] = wasmExports["set_baserel_size_estimates"])(a0, a1);
    var _clauselist_selectivity = Module["_clauselist_selectivity"] = (a0, a1, a2, a3, a4) => (_clauselist_selectivity = Module["_clauselist_selectivity"] = wasmExports["clauselist_selectivity"])(a0, a1, a2, a3, a4);
    var _get_tablespace_page_costs = Module["_get_tablespace_page_costs"] = (a0, a1, a2) => (_get_tablespace_page_costs = Module["_get_tablespace_page_costs"] = wasmExports["get_tablespace_page_costs"])(a0, a1, a2);
    var _cost_qual_eval = Module["_cost_qual_eval"] = (a0, a1, a2) => (_cost_qual_eval = Module["_cost_qual_eval"] = wasmExports["cost_qual_eval"])(a0, a1, a2);
    var _estimate_num_groups = Module["_estimate_num_groups"] = (a0, a1, a2, a3, a4) => (_estimate_num_groups = Module["_estimate_num_groups"] = wasmExports["estimate_num_groups"])(a0, a1, a2, a3, a4);
    var _cost_sort = Module["_cost_sort"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8) => (_cost_sort = Module["_cost_sort"] = wasmExports["cost_sort"])(a0, a1, a2, a3, a4, a5, a6, a7, a8);
    var _get_sortgrouplist_exprs = Module["_get_sortgrouplist_exprs"] = (a0, a1) => (_get_sortgrouplist_exprs = Module["_get_sortgrouplist_exprs"] = wasmExports["get_sortgrouplist_exprs"])(a0, a1);
    var _make_restrictinfo = Module["_make_restrictinfo"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (_make_restrictinfo = Module["_make_restrictinfo"] = wasmExports["make_restrictinfo"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
    var _generate_implied_equalities_for_column = Module["_generate_implied_equalities_for_column"] = (a0, a1, a2, a3, a4) => (_generate_implied_equalities_for_column = Module["_generate_implied_equalities_for_column"] = wasmExports["generate_implied_equalities_for_column"])(a0, a1, a2, a3, a4);
    var _eclass_useful_for_merging = Module["_eclass_useful_for_merging"] = (a0, a1, a2) => (_eclass_useful_for_merging = Module["_eclass_useful_for_merging"] = wasmExports["eclass_useful_for_merging"])(a0, a1, a2);
    var _join_clause_is_movable_to = Module["_join_clause_is_movable_to"] = (a0, a1) => (_join_clause_is_movable_to = Module["_join_clause_is_movable_to"] = wasmExports["join_clause_is_movable_to"])(a0, a1);
    var _get_plan_rowmark = Module["_get_plan_rowmark"] = (a0, a1) => (_get_plan_rowmark = Module["_get_plan_rowmark"] = wasmExports["get_plan_rowmark"])(a0, a1);
    var _update_mergeclause_eclasses = Module["_update_mergeclause_eclasses"] = (a0, a1) => (_update_mergeclause_eclasses = Module["_update_mergeclause_eclasses"] = wasmExports["update_mergeclause_eclasses"])(a0, a1);
    var _find_join_rel = Module["_find_join_rel"] = (a0, a1) => (_find_join_rel = Module["_find_join_rel"] = wasmExports["find_join_rel"])(a0, a1);
    var _make_canonical_pathkey = Module["_make_canonical_pathkey"] = (a0, a1, a2, a3, a4) => (_make_canonical_pathkey = Module["_make_canonical_pathkey"] = wasmExports["make_canonical_pathkey"])(a0, a1, a2, a3, a4);
    var _get_sortgroupref_clause_noerr = Module["_get_sortgroupref_clause_noerr"] = (a0, a1) => (_get_sortgroupref_clause_noerr = Module["_get_sortgroupref_clause_noerr"] = wasmExports["get_sortgroupref_clause_noerr"])(a0, a1);
    var _extract_actual_clauses = Module["_extract_actual_clauses"] = (a0, a1) => (_extract_actual_clauses = Module["_extract_actual_clauses"] = wasmExports["extract_actual_clauses"])(a0, a1);
    var _change_plan_targetlist = Module["_change_plan_targetlist"] = (a0, a1, a2) => (_change_plan_targetlist = Module["_change_plan_targetlist"] = wasmExports["change_plan_targetlist"])(a0, a1, a2);
    var _tlist_member = Module["_tlist_member"] = (a0, a1) => (_tlist_member = Module["_tlist_member"] = wasmExports["tlist_member"])(a0, a1);
    var _make_foreignscan = Module["_make_foreignscan"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_make_foreignscan = Module["_make_foreignscan"] = wasmExports["make_foreignscan"])(a0, a1, a2, a3, a4, a5, a6, a7);
    var _standard_planner = Module["_standard_planner"] = (a0, a1, a2, a3) => (_standard_planner = Module["_standard_planner"] = wasmExports["standard_planner"])(a0, a1, a2, a3);
    var _add_new_columns_to_pathtarget = Module["_add_new_columns_to_pathtarget"] = (a0, a1) => (_add_new_columns_to_pathtarget = Module["_add_new_columns_to_pathtarget"] = wasmExports["add_new_columns_to_pathtarget"])(a0, a1);
    var _get_agg_clause_costs = Module["_get_agg_clause_costs"] = (a0, a1, a2) => (_get_agg_clause_costs = Module["_get_agg_clause_costs"] = wasmExports["get_agg_clause_costs"])(a0, a1, a2);
    var _grouping_is_sortable = Module["_grouping_is_sortable"] = (a0) => (_grouping_is_sortable = Module["_grouping_is_sortable"] = wasmExports["grouping_is_sortable"])(a0);
    var _copy_pathtarget = Module["_copy_pathtarget"] = (a0) => (_copy_pathtarget = Module["_copy_pathtarget"] = wasmExports["copy_pathtarget"])(a0);
    var _create_projection_path = Module["_create_projection_path"] = (a0, a1, a2, a3) => (_create_projection_path = Module["_create_projection_path"] = wasmExports["create_projection_path"])(a0, a1, a2, a3);
    var _GetSysCacheHashValue = Module["_GetSysCacheHashValue"] = (a0, a1, a2, a3, a4) => (_GetSysCacheHashValue = Module["_GetSysCacheHashValue"] = wasmExports["GetSysCacheHashValue"])(a0, a1, a2, a3, a4);
    var _get_translated_update_targetlist = Module["_get_translated_update_targetlist"] = (a0, a1, a2, a3) => (_get_translated_update_targetlist = Module["_get_translated_update_targetlist"] = wasmExports["get_translated_update_targetlist"])(a0, a1, a2, a3);
    var _add_row_identity_var = Module["_add_row_identity_var"] = (a0, a1, a2, a3) => (_add_row_identity_var = Module["_add_row_identity_var"] = wasmExports["add_row_identity_var"])(a0, a1, a2, a3);
    var _get_rel_all_updated_cols = Module["_get_rel_all_updated_cols"] = (a0, a1) => (_get_rel_all_updated_cols = Module["_get_rel_all_updated_cols"] = wasmExports["get_rel_all_updated_cols"])(a0, a1);
    var _get_baserel_parampathinfo = Module["_get_baserel_parampathinfo"] = (a0, a1, a2) => (_get_baserel_parampathinfo = Module["_get_baserel_parampathinfo"] = wasmExports["get_baserel_parampathinfo"])(a0, a1, a2);
    var _create_foreignscan_path = Module["_create_foreignscan_path"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (_create_foreignscan_path = Module["_create_foreignscan_path"] = wasmExports["create_foreignscan_path"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
    var _create_foreign_join_path = Module["_create_foreign_join_path"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (_create_foreign_join_path = Module["_create_foreign_join_path"] = wasmExports["create_foreign_join_path"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
    var _create_foreign_upper_path = Module["_create_foreign_upper_path"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (_create_foreign_upper_path = Module["_create_foreign_upper_path"] = wasmExports["create_foreign_upper_path"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
    var _adjust_limit_rows_costs = Module["_adjust_limit_rows_costs"] = (a0, a1, a2, a3, a4) => (_adjust_limit_rows_costs = Module["_adjust_limit_rows_costs"] = wasmExports["adjust_limit_rows_costs"])(a0, a1, a2, a3, a4);
    var _add_to_flat_tlist = Module["_add_to_flat_tlist"] = (a0, a1) => (_add_to_flat_tlist = Module["_add_to_flat_tlist"] = wasmExports["add_to_flat_tlist"])(a0, a1);
    var _get_fn_expr_argtype = Module["_get_fn_expr_argtype"] = (a0, a1) => (_get_fn_expr_argtype = Module["_get_fn_expr_argtype"] = wasmExports["get_fn_expr_argtype"])(a0, a1);
    var _on_shmem_exit = Module["_on_shmem_exit"] = (a0, a1) => (_on_shmem_exit = Module["_on_shmem_exit"] = wasmExports["on_shmem_exit"])(a0, a1);
    var _SignalHandlerForConfigReload = Module["_SignalHandlerForConfigReload"] = (a0) => (_SignalHandlerForConfigReload = Module["_SignalHandlerForConfigReload"] = wasmExports["SignalHandlerForConfigReload"])(a0);
    var _SignalHandlerForShutdownRequest = Module["_SignalHandlerForShutdownRequest"] = (a0) => (_SignalHandlerForShutdownRequest = Module["_SignalHandlerForShutdownRequest"] = wasmExports["SignalHandlerForShutdownRequest"])(a0);
    var _procsignal_sigusr1_handler = Module["_procsignal_sigusr1_handler"] = (a0) => (_procsignal_sigusr1_handler = Module["_procsignal_sigusr1_handler"] = wasmExports["procsignal_sigusr1_handler"])(a0);
    var _RegisterBackgroundWorker = Module["_RegisterBackgroundWorker"] = (a0) => (_RegisterBackgroundWorker = Module["_RegisterBackgroundWorker"] = wasmExports["RegisterBackgroundWorker"])(a0);
    var _WaitForBackgroundWorkerStartup = Module["_WaitForBackgroundWorkerStartup"] = (a0, a1) => (_WaitForBackgroundWorkerStartup = Module["_WaitForBackgroundWorkerStartup"] = wasmExports["WaitForBackgroundWorkerStartup"])(a0, a1);
    var _GetConfigOption = Module["_GetConfigOption"] = (a0, a1, a2) => (_GetConfigOption = Module["_GetConfigOption"] = wasmExports["GetConfigOption"])(a0, a1, a2);
    var _toupper = Module["_toupper"] = (a0) => (_toupper = Module["_toupper"] = wasmExports["toupper"])(a0);
    var _pg_reg_getinitialstate = Module["_pg_reg_getinitialstate"] = (a0) => (_pg_reg_getinitialstate = Module["_pg_reg_getinitialstate"] = wasmExports["pg_reg_getinitialstate"])(a0);
    var _pg_reg_getfinalstate = Module["_pg_reg_getfinalstate"] = (a0) => (_pg_reg_getfinalstate = Module["_pg_reg_getfinalstate"] = wasmExports["pg_reg_getfinalstate"])(a0);
    var _pg_reg_getnumoutarcs = Module["_pg_reg_getnumoutarcs"] = (a0, a1) => (_pg_reg_getnumoutarcs = Module["_pg_reg_getnumoutarcs"] = wasmExports["pg_reg_getnumoutarcs"])(a0, a1);
    var _pg_reg_getoutarcs = Module["_pg_reg_getoutarcs"] = (a0, a1, a2, a3) => (_pg_reg_getoutarcs = Module["_pg_reg_getoutarcs"] = wasmExports["pg_reg_getoutarcs"])(a0, a1, a2, a3);
    var _pg_reg_getnumcolors = Module["_pg_reg_getnumcolors"] = (a0) => (_pg_reg_getnumcolors = Module["_pg_reg_getnumcolors"] = wasmExports["pg_reg_getnumcolors"])(a0);
    var _pg_reg_colorisbegin = Module["_pg_reg_colorisbegin"] = (a0, a1) => (_pg_reg_colorisbegin = Module["_pg_reg_colorisbegin"] = wasmExports["pg_reg_colorisbegin"])(a0, a1);
    var _pg_reg_colorisend = Module["_pg_reg_colorisend"] = (a0, a1) => (_pg_reg_colorisend = Module["_pg_reg_colorisend"] = wasmExports["pg_reg_colorisend"])(a0, a1);
    var _pg_reg_getnumcharacters = Module["_pg_reg_getnumcharacters"] = (a0, a1) => (_pg_reg_getnumcharacters = Module["_pg_reg_getnumcharacters"] = wasmExports["pg_reg_getnumcharacters"])(a0, a1);
    var _pg_reg_getcharacters = Module["_pg_reg_getcharacters"] = (a0, a1, a2, a3) => (_pg_reg_getcharacters = Module["_pg_reg_getcharacters"] = wasmExports["pg_reg_getcharacters"])(a0, a1, a2, a3);
    var _OutputPluginPrepareWrite = Module["_OutputPluginPrepareWrite"] = (a0, a1) => (_OutputPluginPrepareWrite = Module["_OutputPluginPrepareWrite"] = wasmExports["OutputPluginPrepareWrite"])(a0, a1);
    var _OutputPluginWrite = Module["_OutputPluginWrite"] = (a0, a1) => (_OutputPluginWrite = Module["_OutputPluginWrite"] = wasmExports["OutputPluginWrite"])(a0, a1);
    var _array_contains_nulls = Module["_array_contains_nulls"] = (a0) => (_array_contains_nulls = Module["_array_contains_nulls"] = wasmExports["array_contains_nulls"])(a0);
    var _hash_seq_term = Module["_hash_seq_term"] = (a0) => (_hash_seq_term = Module["_hash_seq_term"] = wasmExports["hash_seq_term"])(a0);
    var _FreeErrorData = Module["_FreeErrorData"] = (a0) => (_FreeErrorData = Module["_FreeErrorData"] = wasmExports["FreeErrorData"])(a0);
    var _RelidByRelfilenumber = Module["_RelidByRelfilenumber"] = (a0, a1) => (_RelidByRelfilenumber = Module["_RelidByRelfilenumber"] = wasmExports["RelidByRelfilenumber"])(a0, a1);
    var _WaitLatchOrSocket = Module["_WaitLatchOrSocket"] = (a0, a1, a2, a3, a4) => (_WaitLatchOrSocket = Module["_WaitLatchOrSocket"] = wasmExports["WaitLatchOrSocket"])(a0, a1, a2, a3, a4);
    var _hash_estimate_size = Module["_hash_estimate_size"] = (a0, a1) => (_hash_estimate_size = Module["_hash_estimate_size"] = wasmExports["hash_estimate_size"])(a0, a1);
    var _ShmemInitHash = Module["_ShmemInitHash"] = (a0, a1, a2, a3, a4) => (_ShmemInitHash = Module["_ShmemInitHash"] = wasmExports["ShmemInitHash"])(a0, a1, a2, a3, a4);
    var _LockBufHdr = Module["_LockBufHdr"] = (a0) => (_LockBufHdr = Module["_LockBufHdr"] = wasmExports["LockBufHdr"])(a0);
    var _EvictUnpinnedBuffer = Module["_EvictUnpinnedBuffer"] = (a0) => (_EvictUnpinnedBuffer = Module["_EvictUnpinnedBuffer"] = wasmExports["EvictUnpinnedBuffer"])(a0);
    var _have_free_buffer = Module["_have_free_buffer"] = () => (_have_free_buffer = Module["_have_free_buffer"] = wasmExports["have_free_buffer"])();
    var _copy_file = Module["_copy_file"] = (a0, a1) => (_copy_file = Module["_copy_file"] = wasmExports["copy_file"])(a0, a1);
    var _AcquireExternalFD = Module["_AcquireExternalFD"] = () => (_AcquireExternalFD = Module["_AcquireExternalFD"] = wasmExports["AcquireExternalFD"])();
    var _GetNamedDSMSegment = Module["_GetNamedDSMSegment"] = (a0, a1, a2, a3) => (_GetNamedDSMSegment = Module["_GetNamedDSMSegment"] = wasmExports["GetNamedDSMSegment"])(a0, a1, a2, a3);
    var _RequestAddinShmemSpace = Module["_RequestAddinShmemSpace"] = (a0) => (_RequestAddinShmemSpace = Module["_RequestAddinShmemSpace"] = wasmExports["RequestAddinShmemSpace"])(a0);
    var _GetRunningTransactionData = Module["_GetRunningTransactionData"] = () => (_GetRunningTransactionData = Module["_GetRunningTransactionData"] = wasmExports["GetRunningTransactionData"])();
    var _BackendXidGetPid = Module["_BackendXidGetPid"] = (a0) => (_BackendXidGetPid = Module["_BackendXidGetPid"] = wasmExports["BackendXidGetPid"])(a0);
    var _LWLockNewTrancheId = Module["_LWLockNewTrancheId"] = () => (_LWLockNewTrancheId = Module["_LWLockNewTrancheId"] = wasmExports["LWLockNewTrancheId"])();
    var _LWLockRegisterTranche = Module["_LWLockRegisterTranche"] = (a0, a1) => (_LWLockRegisterTranche = Module["_LWLockRegisterTranche"] = wasmExports["LWLockRegisterTranche"])(a0, a1);
    var _GetNamedLWLockTranche = Module["_GetNamedLWLockTranche"] = (a0) => (_GetNamedLWLockTranche = Module["_GetNamedLWLockTranche"] = wasmExports["GetNamedLWLockTranche"])(a0);
    var _RequestNamedLWLockTranche = Module["_RequestNamedLWLockTranche"] = (a0, a1) => (_RequestNamedLWLockTranche = Module["_RequestNamedLWLockTranche"] = wasmExports["RequestNamedLWLockTranche"])(a0, a1);
    var _standard_ProcessUtility = Module["_standard_ProcessUtility"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_standard_ProcessUtility = Module["_standard_ProcessUtility"] = wasmExports["standard_ProcessUtility"])(a0, a1, a2, a3, a4, a5, a6, a7);
    var _lookup_ts_dictionary_cache = Module["_lookup_ts_dictionary_cache"] = (a0) => (_lookup_ts_dictionary_cache = Module["_lookup_ts_dictionary_cache"] = wasmExports["lookup_ts_dictionary_cache"])(a0);
    var _get_tsearch_config_filename = Module["_get_tsearch_config_filename"] = (a0, a1) => (_get_tsearch_config_filename = Module["_get_tsearch_config_filename"] = wasmExports["get_tsearch_config_filename"])(a0, a1);
    var _lowerstr = Module["_lowerstr"] = (a0) => (_lowerstr = Module["_lowerstr"] = wasmExports["lowerstr"])(a0);
    var _readstoplist = Module["_readstoplist"] = (a0, a1, a2) => (_readstoplist = Module["_readstoplist"] = wasmExports["readstoplist"])(a0, a1, a2);
    var _lowerstr_with_len = Module["_lowerstr_with_len"] = (a0, a1) => (_lowerstr_with_len = Module["_lowerstr_with_len"] = wasmExports["lowerstr_with_len"])(a0, a1);
    var _searchstoplist = Module["_searchstoplist"] = (a0, a1) => (_searchstoplist = Module["_searchstoplist"] = wasmExports["searchstoplist"])(a0, a1);
    var _tsearch_readline_begin = Module["_tsearch_readline_begin"] = (a0, a1) => (_tsearch_readline_begin = Module["_tsearch_readline_begin"] = wasmExports["tsearch_readline_begin"])(a0, a1);
    var _tsearch_readline = Module["_tsearch_readline"] = (a0) => (_tsearch_readline = Module["_tsearch_readline"] = wasmExports["tsearch_readline"])(a0);
    var _tsearch_readline_end = Module["_tsearch_readline_end"] = (a0) => (_tsearch_readline_end = Module["_tsearch_readline_end"] = wasmExports["tsearch_readline_end"])(a0);
    var _t_isspace = Module["_t_isspace"] = (a0) => (_t_isspace = Module["_t_isspace"] = wasmExports["t_isspace"])(a0);
    var _t_isdigit = Module["_t_isdigit"] = (a0) => (_t_isdigit = Module["_t_isdigit"] = wasmExports["t_isdigit"])(a0);
    var _t_isalnum = Module["_t_isalnum"] = (a0) => (_t_isalnum = Module["_t_isalnum"] = wasmExports["t_isalnum"])(a0);
    var _get_restriction_variable = Module["_get_restriction_variable"] = (a0, a1, a2, a3, a4, a5) => (_get_restriction_variable = Module["_get_restriction_variable"] = wasmExports["get_restriction_variable"])(a0, a1, a2, a3, a4, a5);
    var _MemoryContextAllocHuge = Module["_MemoryContextAllocHuge"] = (a0, a1) => (_MemoryContextAllocHuge = Module["_MemoryContextAllocHuge"] = wasmExports["MemoryContextAllocHuge"])(a0, a1);
    var _WaitEventExtensionNew = Module["_WaitEventExtensionNew"] = (a0) => (_WaitEventExtensionNew = Module["_WaitEventExtensionNew"] = wasmExports["WaitEventExtensionNew"])(a0);
    var _expand_array = Module["_expand_array"] = (a0, a1, a2) => (_expand_array = Module["_expand_array"] = wasmExports["expand_array"])(a0, a1, a2);
    var _arraycontsel = Module["_arraycontsel"] = (a0) => (_arraycontsel = Module["_arraycontsel"] = wasmExports["arraycontsel"])(a0);
    var _arraycontjoinsel = Module["_arraycontjoinsel"] = (a0) => (_arraycontjoinsel = Module["_arraycontjoinsel"] = wasmExports["arraycontjoinsel"])(a0);
    var _initArrayResult = Module["_initArrayResult"] = (a0, a1, a2) => (_initArrayResult = Module["_initArrayResult"] = wasmExports["initArrayResult"])(a0, a1, a2);
    var _array_create_iterator = Module["_array_create_iterator"] = (a0, a1, a2) => (_array_create_iterator = Module["_array_create_iterator"] = wasmExports["array_create_iterator"])(a0, a1, a2);
    var _array_iterate = Module["_array_iterate"] = (a0, a1, a2) => (_array_iterate = Module["_array_iterate"] = wasmExports["array_iterate"])(a0, a1, a2);
    var _cash_cmp = Module["_cash_cmp"] = (a0) => (_cash_cmp = Module["_cash_cmp"] = wasmExports["cash_cmp"])(a0);
    var _int64_to_numeric = Module["_int64_to_numeric"] = (a0) => (_int64_to_numeric = Module["_int64_to_numeric"] = wasmExports["int64_to_numeric"])(a0);
    var _numeric_div = Module["_numeric_div"] = (a0) => (_numeric_div = Module["_numeric_div"] = wasmExports["numeric_div"])(a0);
    var _date_eq = Module["_date_eq"] = (a0) => (_date_eq = Module["_date_eq"] = wasmExports["date_eq"])(a0);
    var _date_lt = Module["_date_lt"] = (a0) => (_date_lt = Module["_date_lt"] = wasmExports["date_lt"])(a0);
    var _date_le = Module["_date_le"] = (a0) => (_date_le = Module["_date_le"] = wasmExports["date_le"])(a0);
    var _date_gt = Module["_date_gt"] = (a0) => (_date_gt = Module["_date_gt"] = wasmExports["date_gt"])(a0);
    var _date_ge = Module["_date_ge"] = (a0) => (_date_ge = Module["_date_ge"] = wasmExports["date_ge"])(a0);
    var _date_cmp = Module["_date_cmp"] = (a0) => (_date_cmp = Module["_date_cmp"] = wasmExports["date_cmp"])(a0);
    var _date_mi = Module["_date_mi"] = (a0) => (_date_mi = Module["_date_mi"] = wasmExports["date_mi"])(a0);
    var _time_eq = Module["_time_eq"] = (a0) => (_time_eq = Module["_time_eq"] = wasmExports["time_eq"])(a0);
    var _time_lt = Module["_time_lt"] = (a0) => (_time_lt = Module["_time_lt"] = wasmExports["time_lt"])(a0);
    var _time_le = Module["_time_le"] = (a0) => (_time_le = Module["_time_le"] = wasmExports["time_le"])(a0);
    var _time_gt = Module["_time_gt"] = (a0) => (_time_gt = Module["_time_gt"] = wasmExports["time_gt"])(a0);
    var _time_ge = Module["_time_ge"] = (a0) => (_time_ge = Module["_time_ge"] = wasmExports["time_ge"])(a0);
    var _time_cmp = Module["_time_cmp"] = (a0) => (_time_cmp = Module["_time_cmp"] = wasmExports["time_cmp"])(a0);
    var _time_mi_time = Module["_time_mi_time"] = (a0) => (_time_mi_time = Module["_time_mi_time"] = wasmExports["time_mi_time"])(a0);
    var _timetz_cmp = Module["_timetz_cmp"] = (a0) => (_timetz_cmp = Module["_timetz_cmp"] = wasmExports["timetz_cmp"])(a0);
    var _TransferExpandedObject = Module["_TransferExpandedObject"] = (a0, a1) => (_TransferExpandedObject = Module["_TransferExpandedObject"] = wasmExports["TransferExpandedObject"])(a0, a1);
    var _numeric_lt = Module["_numeric_lt"] = (a0) => (_numeric_lt = Module["_numeric_lt"] = wasmExports["numeric_lt"])(a0);
    var _numeric_ge = Module["_numeric_ge"] = (a0) => (_numeric_ge = Module["_numeric_ge"] = wasmExports["numeric_ge"])(a0);
    var _domain_check = Module["_domain_check"] = (a0, a1, a2, a3, a4) => (_domain_check = Module["_domain_check"] = wasmExports["domain_check"])(a0, a1, a2, a3, a4);
    var _err_generic_string = Module["_err_generic_string"] = (a0, a1) => (_err_generic_string = Module["_err_generic_string"] = wasmExports["err_generic_string"])(a0, a1);
    var _enum_lt = Module["_enum_lt"] = (a0) => (_enum_lt = Module["_enum_lt"] = wasmExports["enum_lt"])(a0);
    var _enum_le = Module["_enum_le"] = (a0) => (_enum_le = Module["_enum_le"] = wasmExports["enum_le"])(a0);
    var _enum_ge = Module["_enum_ge"] = (a0) => (_enum_ge = Module["_enum_ge"] = wasmExports["enum_ge"])(a0);
    var _enum_gt = Module["_enum_gt"] = (a0) => (_enum_gt = Module["_enum_gt"] = wasmExports["enum_gt"])(a0);
    var _enum_cmp = Module["_enum_cmp"] = (a0) => (_enum_cmp = Module["_enum_cmp"] = wasmExports["enum_cmp"])(a0);
    var _make_expanded_record_from_typeid = Module["_make_expanded_record_from_typeid"] = (a0, a1, a2) => (_make_expanded_record_from_typeid = Module["_make_expanded_record_from_typeid"] = wasmExports["make_expanded_record_from_typeid"])(a0, a1, a2);
    var _make_expanded_record_from_tupdesc = Module["_make_expanded_record_from_tupdesc"] = (a0, a1) => (_make_expanded_record_from_tupdesc = Module["_make_expanded_record_from_tupdesc"] = wasmExports["make_expanded_record_from_tupdesc"])(a0, a1);
    var _make_expanded_record_from_exprecord = Module["_make_expanded_record_from_exprecord"] = (a0, a1) => (_make_expanded_record_from_exprecord = Module["_make_expanded_record_from_exprecord"] = wasmExports["make_expanded_record_from_exprecord"])(a0, a1);
    var _expanded_record_set_tuple = Module["_expanded_record_set_tuple"] = (a0, a1, a2, a3) => (_expanded_record_set_tuple = Module["_expanded_record_set_tuple"] = wasmExports["expanded_record_set_tuple"])(a0, a1, a2, a3);
    var _expanded_record_get_tuple = Module["_expanded_record_get_tuple"] = (a0) => (_expanded_record_get_tuple = Module["_expanded_record_get_tuple"] = wasmExports["expanded_record_get_tuple"])(a0);
    var _deconstruct_expanded_record = Module["_deconstruct_expanded_record"] = (a0) => (_deconstruct_expanded_record = Module["_deconstruct_expanded_record"] = wasmExports["deconstruct_expanded_record"])(a0);
    var _expanded_record_lookup_field = Module["_expanded_record_lookup_field"] = (a0, a1, a2) => (_expanded_record_lookup_field = Module["_expanded_record_lookup_field"] = wasmExports["expanded_record_lookup_field"])(a0, a1, a2);
    var _expanded_record_set_field_internal = Module["_expanded_record_set_field_internal"] = (a0, a1, a2, a3, a4, a5) => (_expanded_record_set_field_internal = Module["_expanded_record_set_field_internal"] = wasmExports["expanded_record_set_field_internal"])(a0, a1, a2, a3, a4, a5);
    var _expanded_record_set_fields = Module["_expanded_record_set_fields"] = (a0, a1, a2, a3) => (_expanded_record_set_fields = Module["_expanded_record_set_fields"] = wasmExports["expanded_record_set_fields"])(a0, a1, a2, a3);
    var _float4in_internal = Module["_float4in_internal"] = (a0, a1, a2, a3, a4) => (_float4in_internal = Module["_float4in_internal"] = wasmExports["float4in_internal"])(a0, a1, a2, a3, a4);
    var _float8in_internal = Module["_float8in_internal"] = (a0, a1, a2, a3, a4) => (_float8in_internal = Module["_float8in_internal"] = wasmExports["float8in_internal"])(a0, a1, a2, a3, a4);
    var _float8out_internal = Module["_float8out_internal"] = (a0) => (_float8out_internal = Module["_float8out_internal"] = wasmExports["float8out_internal"])(a0);
    var _btfloat4cmp = Module["_btfloat4cmp"] = (a0) => (_btfloat4cmp = Module["_btfloat4cmp"] = wasmExports["btfloat4cmp"])(a0);
    var _btfloat8cmp = Module["_btfloat8cmp"] = (a0) => (_btfloat8cmp = Module["_btfloat8cmp"] = wasmExports["btfloat8cmp"])(a0);
    var _asin = Module["_asin"] = (a0) => (_asin = Module["_asin"] = wasmExports["asin"])(a0);
    var _cos = Module["_cos"] = (a0) => (_cos = Module["_cos"] = wasmExports["cos"])(a0);
    var _str_tolower = Module["_str_tolower"] = (a0, a1, a2) => (_str_tolower = Module["_str_tolower"] = wasmExports["str_tolower"])(a0, a1, a2);
    var _pushJsonbValue = Module["_pushJsonbValue"] = (a0, a1, a2) => (_pushJsonbValue = Module["_pushJsonbValue"] = wasmExports["pushJsonbValue"])(a0, a1, a2);
    var _numeric_cmp = Module["_numeric_cmp"] = (a0) => (_numeric_cmp = Module["_numeric_cmp"] = wasmExports["numeric_cmp"])(a0);
    var _numeric_eq = Module["_numeric_eq"] = (a0) => (_numeric_eq = Module["_numeric_eq"] = wasmExports["numeric_eq"])(a0);
    var _numeric_is_nan = Module["_numeric_is_nan"] = (a0) => (_numeric_is_nan = Module["_numeric_is_nan"] = wasmExports["numeric_is_nan"])(a0);
    var _timestamp_cmp = Module["_timestamp_cmp"] = (a0) => (_timestamp_cmp = Module["_timestamp_cmp"] = wasmExports["timestamp_cmp"])(a0);
    var _macaddr_cmp = Module["_macaddr_cmp"] = (a0) => (_macaddr_cmp = Module["_macaddr_cmp"] = wasmExports["macaddr_cmp"])(a0);
    var _macaddr_lt = Module["_macaddr_lt"] = (a0) => (_macaddr_lt = Module["_macaddr_lt"] = wasmExports["macaddr_lt"])(a0);
    var _macaddr_le = Module["_macaddr_le"] = (a0) => (_macaddr_le = Module["_macaddr_le"] = wasmExports["macaddr_le"])(a0);
    var _macaddr_eq = Module["_macaddr_eq"] = (a0) => (_macaddr_eq = Module["_macaddr_eq"] = wasmExports["macaddr_eq"])(a0);
    var _macaddr_ge = Module["_macaddr_ge"] = (a0) => (_macaddr_ge = Module["_macaddr_ge"] = wasmExports["macaddr_ge"])(a0);
    var _macaddr_gt = Module["_macaddr_gt"] = (a0) => (_macaddr_gt = Module["_macaddr_gt"] = wasmExports["macaddr_gt"])(a0);
    var _macaddr8_cmp = Module["_macaddr8_cmp"] = (a0) => (_macaddr8_cmp = Module["_macaddr8_cmp"] = wasmExports["macaddr8_cmp"])(a0);
    var _macaddr8_lt = Module["_macaddr8_lt"] = (a0) => (_macaddr8_lt = Module["_macaddr8_lt"] = wasmExports["macaddr8_lt"])(a0);
    var _macaddr8_le = Module["_macaddr8_le"] = (a0) => (_macaddr8_le = Module["_macaddr8_le"] = wasmExports["macaddr8_le"])(a0);
    var _macaddr8_eq = Module["_macaddr8_eq"] = (a0) => (_macaddr8_eq = Module["_macaddr8_eq"] = wasmExports["macaddr8_eq"])(a0);
    var _macaddr8_ge = Module["_macaddr8_ge"] = (a0) => (_macaddr8_ge = Module["_macaddr8_ge"] = wasmExports["macaddr8_ge"])(a0);
    var _macaddr8_gt = Module["_macaddr8_gt"] = (a0) => (_macaddr8_gt = Module["_macaddr8_gt"] = wasmExports["macaddr8_gt"])(a0);
    var _current_query = Module["_current_query"] = (a0) => (_current_query = Module["_current_query"] = wasmExports["current_query"])(a0);
    var _unpack_sql_state = Module["_unpack_sql_state"] = (a0) => (_unpack_sql_state = Module["_unpack_sql_state"] = wasmExports["unpack_sql_state"])(a0);
    var _get_fn_expr_rettype = Module["_get_fn_expr_rettype"] = (a0) => (_get_fn_expr_rettype = Module["_get_fn_expr_rettype"] = wasmExports["get_fn_expr_rettype"])(a0);
    var _btnamecmp = Module["_btnamecmp"] = (a0) => (_btnamecmp = Module["_btnamecmp"] = wasmExports["btnamecmp"])(a0);
    var _inet_in = Module["_inet_in"] = (a0) => (_inet_in = Module["_inet_in"] = wasmExports["inet_in"])(a0);
    var _network_cmp = Module["_network_cmp"] = (a0) => (_network_cmp = Module["_network_cmp"] = wasmExports["network_cmp"])(a0);
    var _convert_network_to_scalar = Module["_convert_network_to_scalar"] = (a0, a1, a2) => (_convert_network_to_scalar = Module["_convert_network_to_scalar"] = wasmExports["convert_network_to_scalar"])(a0, a1, a2);
    var _numeric_gt = Module["_numeric_gt"] = (a0) => (_numeric_gt = Module["_numeric_gt"] = wasmExports["numeric_gt"])(a0);
    var _numeric_le = Module["_numeric_le"] = (a0) => (_numeric_le = Module["_numeric_le"] = wasmExports["numeric_le"])(a0);
    var _numeric_float8_no_overflow = Module["_numeric_float8_no_overflow"] = (a0) => (_numeric_float8_no_overflow = Module["_numeric_float8_no_overflow"] = wasmExports["numeric_float8_no_overflow"])(a0);
    var _interval_mi = Module["_interval_mi"] = (a0) => (_interval_mi = Module["_interval_mi"] = wasmExports["interval_mi"])(a0);
    var _quote_ident = Module["_quote_ident"] = (a0) => (_quote_ident = Module["_quote_ident"] = wasmExports["quote_ident"])(a0);
    var _pg_wchar2mb_with_len = Module["_pg_wchar2mb_with_len"] = (a0, a1, a2) => (_pg_wchar2mb_with_len = Module["_pg_wchar2mb_with_len"] = wasmExports["pg_wchar2mb_with_len"])(a0, a1, a2);
    var _pg_get_indexdef_columns_extended = Module["_pg_get_indexdef_columns_extended"] = (a0, a1) => (_pg_get_indexdef_columns_extended = Module["_pg_get_indexdef_columns_extended"] = wasmExports["pg_get_indexdef_columns_extended"])(a0, a1);
    var _strcspn = Module["_strcspn"] = (a0, a1) => (_strcspn = Module["_strcspn"] = wasmExports["strcspn"])(a0, a1);
    var _generic_restriction_selectivity = Module["_generic_restriction_selectivity"] = (a0, a1, a2, a3, a4, a5) => (_generic_restriction_selectivity = Module["_generic_restriction_selectivity"] = wasmExports["generic_restriction_selectivity"])(a0, a1, a2, a3, a4, a5);
    var _genericcostestimate = Module["_genericcostestimate"] = (a0, a1, a2, a3) => (_genericcostestimate = Module["_genericcostestimate"] = wasmExports["genericcostestimate"])(a0, a1, a2, a3);
    var _tidin = Module["_tidin"] = (a0) => (_tidin = Module["_tidin"] = wasmExports["tidin"])(a0);
    var _tidout = Module["_tidout"] = (a0) => (_tidout = Module["_tidout"] = wasmExports["tidout"])(a0);
    var _timestamp_in = Module["_timestamp_in"] = (a0) => (_timestamp_in = Module["_timestamp_in"] = wasmExports["timestamp_in"])(a0);
    var _timestamp_eq = Module["_timestamp_eq"] = (a0) => (_timestamp_eq = Module["_timestamp_eq"] = wasmExports["timestamp_eq"])(a0);
    var _timestamp_lt = Module["_timestamp_lt"] = (a0) => (_timestamp_lt = Module["_timestamp_lt"] = wasmExports["timestamp_lt"])(a0);
    var _timestamp_gt = Module["_timestamp_gt"] = (a0) => (_timestamp_gt = Module["_timestamp_gt"] = wasmExports["timestamp_gt"])(a0);
    var _timestamp_le = Module["_timestamp_le"] = (a0) => (_timestamp_le = Module["_timestamp_le"] = wasmExports["timestamp_le"])(a0);
    var _timestamp_ge = Module["_timestamp_ge"] = (a0) => (_timestamp_ge = Module["_timestamp_ge"] = wasmExports["timestamp_ge"])(a0);
    var _interval_eq = Module["_interval_eq"] = (a0) => (_interval_eq = Module["_interval_eq"] = wasmExports["interval_eq"])(a0);
    var _interval_lt = Module["_interval_lt"] = (a0) => (_interval_lt = Module["_interval_lt"] = wasmExports["interval_lt"])(a0);
    var _interval_gt = Module["_interval_gt"] = (a0) => (_interval_gt = Module["_interval_gt"] = wasmExports["interval_gt"])(a0);
    var _interval_le = Module["_interval_le"] = (a0) => (_interval_le = Module["_interval_le"] = wasmExports["interval_le"])(a0);
    var _interval_ge = Module["_interval_ge"] = (a0) => (_interval_ge = Module["_interval_ge"] = wasmExports["interval_ge"])(a0);
    var _interval_cmp = Module["_interval_cmp"] = (a0) => (_interval_cmp = Module["_interval_cmp"] = wasmExports["interval_cmp"])(a0);
    var _timestamp_mi = Module["_timestamp_mi"] = (a0) => (_timestamp_mi = Module["_timestamp_mi"] = wasmExports["timestamp_mi"])(a0);
    var _interval_um = Module["_interval_um"] = (a0) => (_interval_um = Module["_interval_um"] = wasmExports["interval_um"])(a0);
    var _has_fn_opclass_options = Module["_has_fn_opclass_options"] = (a0) => (_has_fn_opclass_options = Module["_has_fn_opclass_options"] = wasmExports["has_fn_opclass_options"])(a0);
    var _uuid_in = Module["_uuid_in"] = (a0) => (_uuid_in = Module["_uuid_in"] = wasmExports["uuid_in"])(a0);
    var _uuid_out = Module["_uuid_out"] = (a0) => (_uuid_out = Module["_uuid_out"] = wasmExports["uuid_out"])(a0);
    var _uuid_cmp = Module["_uuid_cmp"] = (a0) => (_uuid_cmp = Module["_uuid_cmp"] = wasmExports["uuid_cmp"])(a0);
    var _gen_random_uuid = Module["_gen_random_uuid"] = (a0) => (_gen_random_uuid = Module["_gen_random_uuid"] = wasmExports["gen_random_uuid"])(a0);
    var _varbit_in = Module["_varbit_in"] = (a0) => (_varbit_in = Module["_varbit_in"] = wasmExports["varbit_in"])(a0);
    var _biteq = Module["_biteq"] = (a0) => (_biteq = Module["_biteq"] = wasmExports["biteq"])(a0);
    var _bitlt = Module["_bitlt"] = (a0) => (_bitlt = Module["_bitlt"] = wasmExports["bitlt"])(a0);
    var _bitle = Module["_bitle"] = (a0) => (_bitle = Module["_bitle"] = wasmExports["bitle"])(a0);
    var _bitgt = Module["_bitgt"] = (a0) => (_bitgt = Module["_bitgt"] = wasmExports["bitgt"])(a0);
    var _bitge = Module["_bitge"] = (a0) => (_bitge = Module["_bitge"] = wasmExports["bitge"])(a0);
    var _bitcmp = Module["_bitcmp"] = (a0) => (_bitcmp = Module["_bitcmp"] = wasmExports["bitcmp"])(a0);
    var _bpchareq = Module["_bpchareq"] = (a0) => (_bpchareq = Module["_bpchareq"] = wasmExports["bpchareq"])(a0);
    var _bpcharlt = Module["_bpcharlt"] = (a0) => (_bpcharlt = Module["_bpcharlt"] = wasmExports["bpcharlt"])(a0);
    var _bpcharle = Module["_bpcharle"] = (a0) => (_bpcharle = Module["_bpcharle"] = wasmExports["bpcharle"])(a0);
    var _bpchargt = Module["_bpchargt"] = (a0) => (_bpchargt = Module["_bpchargt"] = wasmExports["bpchargt"])(a0);
    var _bpcharge = Module["_bpcharge"] = (a0) => (_bpcharge = Module["_bpcharge"] = wasmExports["bpcharge"])(a0);
    var _bpcharcmp = Module["_bpcharcmp"] = (a0) => (_bpcharcmp = Module["_bpcharcmp"] = wasmExports["bpcharcmp"])(a0);
    var _texteq = Module["_texteq"] = (a0) => (_texteq = Module["_texteq"] = wasmExports["texteq"])(a0);
    var _text_lt = Module["_text_lt"] = (a0) => (_text_lt = Module["_text_lt"] = wasmExports["text_lt"])(a0);
    var _text_le = Module["_text_le"] = (a0) => (_text_le = Module["_text_le"] = wasmExports["text_le"])(a0);
    var _text_gt = Module["_text_gt"] = (a0) => (_text_gt = Module["_text_gt"] = wasmExports["text_gt"])(a0);
    var _text_ge = Module["_text_ge"] = (a0) => (_text_ge = Module["_text_ge"] = wasmExports["text_ge"])(a0);
    var _bttextcmp = Module["_bttextcmp"] = (a0) => (_bttextcmp = Module["_bttextcmp"] = wasmExports["bttextcmp"])(a0);
    var _byteaeq = Module["_byteaeq"] = (a0) => (_byteaeq = Module["_byteaeq"] = wasmExports["byteaeq"])(a0);
    var _bytealt = Module["_bytealt"] = (a0) => (_bytealt = Module["_bytealt"] = wasmExports["bytealt"])(a0);
    var _byteale = Module["_byteale"] = (a0) => (_byteale = Module["_byteale"] = wasmExports["byteale"])(a0);
    var _byteagt = Module["_byteagt"] = (a0) => (_byteagt = Module["_byteagt"] = wasmExports["byteagt"])(a0);
    var _byteage = Module["_byteage"] = (a0) => (_byteage = Module["_byteage"] = wasmExports["byteage"])(a0);
    var _byteacmp = Module["_byteacmp"] = (a0) => (_byteacmp = Module["_byteacmp"] = wasmExports["byteacmp"])(a0);
    var _to_hex32 = Module["_to_hex32"] = (a0) => (_to_hex32 = Module["_to_hex32"] = wasmExports["to_hex32"])(a0);
    var _varstr_levenshtein = Module["_varstr_levenshtein"] = (a0, a1, a2, a3, a4, a5, a6, a7) => (_varstr_levenshtein = Module["_varstr_levenshtein"] = wasmExports["varstr_levenshtein"])(a0, a1, a2, a3, a4, a5, a6, a7);
    var _pg_xml_init = Module["_pg_xml_init"] = (a0) => (_pg_xml_init = Module["_pg_xml_init"] = wasmExports["pg_xml_init"])(a0);
    var _xmlInitParser = Module["_xmlInitParser"] = () => (_xmlInitParser = Module["_xmlInitParser"] = wasmExports["xmlInitParser"])();
    var _xml_ereport = Module["_xml_ereport"] = (a0, a1, a2, a3) => (_xml_ereport = Module["_xml_ereport"] = wasmExports["xml_ereport"])(a0, a1, a2, a3);
    var _pg_xml_done = Module["_pg_xml_done"] = (a0, a1) => (_pg_xml_done = Module["_pg_xml_done"] = wasmExports["pg_xml_done"])(a0, a1);
    var _xmlXPathNewContext = Module["_xmlXPathNewContext"] = (a0) => (_xmlXPathNewContext = Module["_xmlXPathNewContext"] = wasmExports["xmlXPathNewContext"])(a0);
    var _xmlXPathFreeContext = Module["_xmlXPathFreeContext"] = (a0) => (_xmlXPathFreeContext = Module["_xmlXPathFreeContext"] = wasmExports["xmlXPathFreeContext"])(a0);
    var _xmlFreeDoc = Module["_xmlFreeDoc"] = (a0) => (_xmlFreeDoc = Module["_xmlFreeDoc"] = wasmExports["xmlFreeDoc"])(a0);
    var _xmlXPathCtxtCompile = Module["_xmlXPathCtxtCompile"] = (a0, a1) => (_xmlXPathCtxtCompile = Module["_xmlXPathCtxtCompile"] = wasmExports["xmlXPathCtxtCompile"])(a0, a1);
    var _xmlXPathCompiledEval = Module["_xmlXPathCompiledEval"] = (a0, a1) => (_xmlXPathCompiledEval = Module["_xmlXPathCompiledEval"] = wasmExports["xmlXPathCompiledEval"])(a0, a1);
    var _xmlXPathFreeObject = Module["_xmlXPathFreeObject"] = (a0) => (_xmlXPathFreeObject = Module["_xmlXPathFreeObject"] = wasmExports["xmlXPathFreeObject"])(a0);
    var _xmlXPathFreeCompExpr = Module["_xmlXPathFreeCompExpr"] = (a0) => (_xmlXPathFreeCompExpr = Module["_xmlXPathFreeCompExpr"] = wasmExports["xmlXPathFreeCompExpr"])(a0);
    var _pg_do_encoding_conversion = Module["_pg_do_encoding_conversion"] = (a0, a1, a2, a3) => (_pg_do_encoding_conversion = Module["_pg_do_encoding_conversion"] = wasmExports["pg_do_encoding_conversion"])(a0, a1, a2, a3);
    var _xmlStrdup = Module["_xmlStrdup"] = (a0) => (_xmlStrdup = Module["_xmlStrdup"] = wasmExports["xmlStrdup"])(a0);
    var _xmlEncodeSpecialChars = Module["_xmlEncodeSpecialChars"] = (a0, a1) => (_xmlEncodeSpecialChars = Module["_xmlEncodeSpecialChars"] = wasmExports["xmlEncodeSpecialChars"])(a0, a1);
    var _xmlStrlen = Module["_xmlStrlen"] = (a0) => (_xmlStrlen = Module["_xmlStrlen"] = wasmExports["xmlStrlen"])(a0);
    var _xmlBufferCreate = Module["_xmlBufferCreate"] = () => (_xmlBufferCreate = Module["_xmlBufferCreate"] = wasmExports["xmlBufferCreate"])();
    var _xmlBufferFree = Module["_xmlBufferFree"] = (a0) => (_xmlBufferFree = Module["_xmlBufferFree"] = wasmExports["xmlBufferFree"])(a0);
    var _xmlXPathCastNodeToString = Module["_xmlXPathCastNodeToString"] = (a0) => (_xmlXPathCastNodeToString = Module["_xmlXPathCastNodeToString"] = wasmExports["xmlXPathCastNodeToString"])(a0);
    var _xmlNodeDump = Module["_xmlNodeDump"] = (a0, a1, a2, a3, a4) => (_xmlNodeDump = Module["_xmlNodeDump"] = wasmExports["xmlNodeDump"])(a0, a1, a2, a3, a4);
    var _get_typsubscript = Module["_get_typsubscript"] = (a0, a1) => (_get_typsubscript = Module["_get_typsubscript"] = wasmExports["get_typsubscript"])(a0, a1);
    var _CachedPlanAllowsSimpleValidityCheck = Module["_CachedPlanAllowsSimpleValidityCheck"] = (a0, a1, a2) => (_CachedPlanAllowsSimpleValidityCheck = Module["_CachedPlanAllowsSimpleValidityCheck"] = wasmExports["CachedPlanAllowsSimpleValidityCheck"])(a0, a1, a2);
    var _CachedPlanIsSimplyValid = Module["_CachedPlanIsSimplyValid"] = (a0, a1, a2) => (_CachedPlanIsSimplyValid = Module["_CachedPlanIsSimplyValid"] = wasmExports["CachedPlanIsSimplyValid"])(a0, a1, a2);
    var _GetCachedExpression = Module["_GetCachedExpression"] = (a0) => (_GetCachedExpression = Module["_GetCachedExpression"] = wasmExports["GetCachedExpression"])(a0);
    var _FreeCachedExpression = Module["_FreeCachedExpression"] = (a0) => (_FreeCachedExpression = Module["_FreeCachedExpression"] = wasmExports["FreeCachedExpression"])(a0);
    var _ReleaseAllPlanCacheRefsInOwner = Module["_ReleaseAllPlanCacheRefsInOwner"] = (a0) => (_ReleaseAllPlanCacheRefsInOwner = Module["_ReleaseAllPlanCacheRefsInOwner"] = wasmExports["ReleaseAllPlanCacheRefsInOwner"])(a0);
    var _in_error_recursion_trouble = Module["_in_error_recursion_trouble"] = () => (_in_error_recursion_trouble = Module["_in_error_recursion_trouble"] = wasmExports["in_error_recursion_trouble"])();
    var _GetErrorContextStack = Module["_GetErrorContextStack"] = () => (_GetErrorContextStack = Module["_GetErrorContextStack"] = wasmExports["GetErrorContextStack"])();
    var _find_rendezvous_variable = Module["_find_rendezvous_variable"] = (a0) => (_find_rendezvous_variable = Module["_find_rendezvous_variable"] = wasmExports["find_rendezvous_variable"])(a0);
    var _CallerFInfoFunctionCall2 = Module["_CallerFInfoFunctionCall2"] = (a0, a1, a2, a3, a4) => (_CallerFInfoFunctionCall2 = Module["_CallerFInfoFunctionCall2"] = wasmExports["CallerFInfoFunctionCall2"])(a0, a1, a2, a3, a4);
    var _resolve_polymorphic_argtypes = Module["_resolve_polymorphic_argtypes"] = (a0, a1, a2, a3) => (_resolve_polymorphic_argtypes = Module["_resolve_polymorphic_argtypes"] = wasmExports["resolve_polymorphic_argtypes"])(a0, a1, a2, a3);
    var _pg_bindtextdomain = Module["_pg_bindtextdomain"] = (a0) => (_pg_bindtextdomain = Module["_pg_bindtextdomain"] = wasmExports["pg_bindtextdomain"])(a0);
    var _DefineCustomBoolVariable = Module["_DefineCustomBoolVariable"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (_DefineCustomBoolVariable = Module["_DefineCustomBoolVariable"] = wasmExports["DefineCustomBoolVariable"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
    var _DefineCustomIntVariable = Module["_DefineCustomIntVariable"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (_DefineCustomIntVariable = Module["_DefineCustomIntVariable"] = wasmExports["DefineCustomIntVariable"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
    var _DefineCustomRealVariable = Module["_DefineCustomRealVariable"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11) => (_DefineCustomRealVariable = Module["_DefineCustomRealVariable"] = wasmExports["DefineCustomRealVariable"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11);
    var _DefineCustomStringVariable = Module["_DefineCustomStringVariable"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9) => (_DefineCustomStringVariable = Module["_DefineCustomStringVariable"] = wasmExports["DefineCustomStringVariable"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9);
    var _DefineCustomEnumVariable = Module["_DefineCustomEnumVariable"] = (a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) => (_DefineCustomEnumVariable = Module["_DefineCustomEnumVariable"] = wasmExports["DefineCustomEnumVariable"])(a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
    var _MarkGUCPrefixReserved = Module["_MarkGUCPrefixReserved"] = (a0) => (_MarkGUCPrefixReserved = Module["_MarkGUCPrefixReserved"] = wasmExports["MarkGUCPrefixReserved"])(a0);
    var _sampler_random_init_state = Module["_sampler_random_init_state"] = (a0, a1) => (_sampler_random_init_state = Module["_sampler_random_init_state"] = wasmExports["sampler_random_init_state"])(a0, a1);
    var _pchomp = Module["_pchomp"] = (a0) => (_pchomp = Module["_pchomp"] = wasmExports["pchomp"])(a0);
    var _PinPortal = Module["_PinPortal"] = (a0) => (_PinPortal = Module["_PinPortal"] = wasmExports["PinPortal"])(a0);
    var _UnpinPortal = Module["_UnpinPortal"] = (a0) => (_UnpinPortal = Module["_UnpinPortal"] = wasmExports["UnpinPortal"])(a0);
    var _xmlBufferWriteCHAR = Module["_xmlBufferWriteCHAR"] = (a0, a1) => (_xmlBufferWriteCHAR = Module["_xmlBufferWriteCHAR"] = wasmExports["xmlBufferWriteCHAR"])(a0, a1);
    var _xmlBufferWriteChar = Module["_xmlBufferWriteChar"] = (a0, a1) => (_xmlBufferWriteChar = Module["_xmlBufferWriteChar"] = wasmExports["xmlBufferWriteChar"])(a0, a1);
    var _xmlReadMemory = Module["_xmlReadMemory"] = (a0, a1, a2, a3, a4) => (_xmlReadMemory = Module["_xmlReadMemory"] = wasmExports["xmlReadMemory"])(a0, a1, a2, a3, a4);
    var _xmlDocGetRootElement = Module["_xmlDocGetRootElement"] = (a0) => (_xmlDocGetRootElement = Module["_xmlDocGetRootElement"] = wasmExports["xmlDocGetRootElement"])(a0);
    var _xmlXPathIsNaN = Module["_xmlXPathIsNaN"] = (a0) => (_xmlXPathIsNaN = Module["_xmlXPathIsNaN"] = wasmExports["xmlXPathIsNaN"])(a0);
    var _xmlXPathCastToBoolean = Module["_xmlXPathCastToBoolean"] = (a0) => (_xmlXPathCastToBoolean = Module["_xmlXPathCastToBoolean"] = wasmExports["xmlXPathCastToBoolean"])(a0);
    var _xmlXPathCastToNumber = Module["_xmlXPathCastToNumber"] = (a0) => (_xmlXPathCastToNumber = Module["_xmlXPathCastToNumber"] = wasmExports["xmlXPathCastToNumber"])(a0);
    var ___dl_seterr = /* @__PURE__ */ __name((a0, a1) => (___dl_seterr = wasmExports["__dl_seterr"])(a0, a1), "___dl_seterr");
    var _getgid = Module["_getgid"] = () => (_getgid = Module["_getgid"] = wasmExports["getgid"])();
    var _getuid = Module["_getuid"] = () => (_getuid = Module["_getuid"] = wasmExports["getuid"])();
    var _gmtime = Module["_gmtime"] = (a0) => (_gmtime = Module["_gmtime"] = wasmExports["gmtime"])(a0);
    var _htonl = /* @__PURE__ */ __name((a0) => (_htonl = wasmExports["htonl"])(a0), "_htonl");
    var _htons = /* @__PURE__ */ __name((a0) => (_htons = wasmExports["htons"])(a0), "_htons");
    var _ioctl = Module["_ioctl"] = (a0, a1, a2) => (_ioctl = Module["_ioctl"] = wasmExports["ioctl"])(a0, a1, a2);
    var _emscripten_builtin_memalign = /* @__PURE__ */ __name((a0, a1) => (_emscripten_builtin_memalign = wasmExports["emscripten_builtin_memalign"])(a0, a1), "_emscripten_builtin_memalign");
    var _ntohs = /* @__PURE__ */ __name((a0) => (_ntohs = wasmExports["ntohs"])(a0), "_ntohs");
    var _perror = Module["_perror"] = (a0) => (_perror = Module["_perror"] = wasmExports["perror"])(a0);
    var _qsort = Module["_qsort"] = (a0, a1, a2, a3) => (_qsort = Module["_qsort"] = wasmExports["qsort"])(a0, a1, a2, a3);
    var _srand = Module["_srand"] = (a0) => (_srand = Module["_srand"] = wasmExports["srand"])(a0);
    var _rand = Module["_rand"] = () => (_rand = Module["_rand"] = wasmExports["rand"])();
    var __emscripten_timeout = /* @__PURE__ */ __name((a0, a1) => (__emscripten_timeout = wasmExports["_emscripten_timeout"])(a0, a1), "__emscripten_timeout");
    var _strerror_r = Module["_strerror_r"] = (a0, a1, a2) => (_strerror_r = Module["_strerror_r"] = wasmExports["strerror_r"])(a0, a1, a2);
    var _strncat = Module["_strncat"] = (a0, a1, a2) => (_strncat = Module["_strncat"] = wasmExports["strncat"])(a0, a1, a2);
    var _setThrew = /* @__PURE__ */ __name((a0, a1) => (_setThrew = wasmExports["setThrew"])(a0, a1), "_setThrew");
    var __emscripten_tempret_set = /* @__PURE__ */ __name((a0) => (__emscripten_tempret_set = wasmExports["_emscripten_tempret_set"])(a0), "__emscripten_tempret_set");
    var __emscripten_tempret_get = /* @__PURE__ */ __name(() => (__emscripten_tempret_get = wasmExports["_emscripten_tempret_get"])(), "__emscripten_tempret_get");
    var __emscripten_stack_restore = /* @__PURE__ */ __name((a0) => (__emscripten_stack_restore = wasmExports["_emscripten_stack_restore"])(a0), "__emscripten_stack_restore");
    var __emscripten_stack_alloc = /* @__PURE__ */ __name((a0) => (__emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"])(a0), "__emscripten_stack_alloc");
    var _emscripten_stack_get_current = /* @__PURE__ */ __name(() => (_emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"])(), "_emscripten_stack_get_current");
    var ___wasm_apply_data_relocs = /* @__PURE__ */ __name(() => (___wasm_apply_data_relocs = wasmExports["__wasm_apply_data_relocs"])(), "___wasm_apply_data_relocs");
    var _stderr = Module["_stderr"] = 2529088;
    var _InterruptPending = Module["_InterruptPending"] = 2670864;
    var _MyLatch = Module["_MyLatch"] = 2671052;
    var _CritSectionCount = Module["_CritSectionCount"] = 2670916;
    var _MyProc = Module["_MyProc"] = 2640668;
    var _pg_global_prng_state = Module["_pg_global_prng_state"] = 2617264;
    var _error_context_stack = Module["_error_context_stack"] = 2669160;
    var _GUC_check_errdetail_string = Module["_GUC_check_errdetail_string"] = 2674812;
    var _IsUnderPostmaster = Module["_IsUnderPostmaster"] = 2670945;
    var _CurrentMemoryContext = Module["_CurrentMemoryContext"] = 2676240;
    var _stdout = Module["_stdout"] = 2529392;
    var _MyProcPort = Module["_MyProcPort"] = 2671040;
    var ___THREW__ = Module["___THREW__"] = 2691908;
    var ___threwValue = Module["___threwValue"] = 2691912;
    var _MyDatabaseId = Module["_MyDatabaseId"] = 2670924;
    var _TopMemoryContext = Module["_TopMemoryContext"] = 2676244;
    var _PG_exception_stack = Module["_PG_exception_stack"] = 2669164;
    var _MyProcPid = Module["_MyProcPid"] = 2671016;
    var _stdin = Module["_stdin"] = 2529240;
    var _ScanKeywords = Module["_ScanKeywords"] = 2365800;
    var _pg_number_of_ones = Module["_pg_number_of_ones"] = 925120;
    var _wal_level = Module["_wal_level"] = 2379840;
    var _SnapshotAnyData = Module["_SnapshotAnyData"] = 2466336;
    var _maintenance_work_mem = Module["_maintenance_work_mem"] = 2413816;
    var _LocalBufferBlockPointers = Module["_LocalBufferBlockPointers"] = 2637244;
    var _BufferBlocks = Module["_BufferBlocks"] = 2631980;
    var _ParallelWorkerNumber = Module["_ParallelWorkerNumber"] = 2371404;
    var _MainLWLockArray = Module["_MainLWLockArray"] = 2638852;
    var _CurrentResourceOwner = Module["_CurrentResourceOwner"] = 2676288;
    var _work_mem = Module["_work_mem"] = 2413800;
    var _NBuffers = Module["_NBuffers"] = 2413824;
    var _bsysscan = Module["_bsysscan"] = 2618500;
    var _CheckXidAlive = Module["_CheckXidAlive"] = 2618496;
    var _XactIsoLevel = Module["_XactIsoLevel"] = 2379704;
    var _pgWalUsage = Module["_pgWalUsage"] = 2621968;
    var _pgBufferUsage = Module["_pgBufferUsage"] = 2621840;
    var _TransamVariables = Module["_TransamVariables"] = 2618488;
    var _TopTransactionContext = Module["_TopTransactionContext"] = 2676264;
    var _RmgrTable = Module["_RmgrTable"] = 2371424;
    var _process_shared_preload_libraries_in_progress = Module["_process_shared_preload_libraries_in_progress"] = 2674208;
    var _wal_segment_size = Module["_wal_segment_size"] = 2379860;
    var _TopTransactionResourceOwner = Module["_TopTransactionResourceOwner"] = 2676296;
    var _arch_module_check_errdetail_string = Module["_arch_module_check_errdetail_string"] = 2631364;
    var _check_function_bodies = Module["_check_function_bodies"] = 2413990;
    var _post_parse_analyze_hook = Module["_post_parse_analyze_hook"] = 2620648;
    var _ScanKeywordTokens = Module["_ScanKeywordTokens"] = 1551648;
    var _SPI_processed = Module["_SPI_processed"] = 2621992;
    var _SPI_tuptable = Module["_SPI_tuptable"] = 2622e3;
    var _check_password_hook = Module["_check_password_hook"] = 2620916;
    var _ConfigReloadPending = Module["_ConfigReloadPending"] = 2631352;
    var _DateStyle = Module["_DateStyle"] = 2413788;
    var _ExecutorStart_hook = Module["_ExecutorStart_hook"] = 2621816;
    var _ExecutorRun_hook = Module["_ExecutorRun_hook"] = 2621820;
    var _ExecutorFinish_hook = Module["_ExecutorFinish_hook"] = 2621824;
    var _ExecutorEnd_hook = Module["_ExecutorEnd_hook"] = 2621828;
    var _SPI_result = Module["_SPI_result"] = 2622004;
    var _ClientAuthentication_hook = Module["_ClientAuthentication_hook"] = 2622176;
    var _cpu_tuple_cost = Module["_cpu_tuple_cost"] = 2384328;
    var _cpu_operator_cost = Module["_cpu_operator_cost"] = 2384344;
    var _seq_page_cost = Module["_seq_page_cost"] = 2384312;
    var _planner_hook = Module["_planner_hook"] = 2631048;
    var _ShutdownRequestPending = Module["_ShutdownRequestPending"] = 2631356;
    var _MyStartTime = Module["_MyStartTime"] = 2671024;
    var _cluster_name = Module["_cluster_name"] = 2414040;
    var _application_name = Module["_application_name"] = 2675036;
    var _BufferDescriptors = Module["_BufferDescriptors"] = 2631976;
    var _shmem_startup_hook = Module["_shmem_startup_hook"] = 2637924;
    var _ProcessUtility_hook = Module["_ProcessUtility_hook"] = 2640756;
    var _IntervalStyle = Module["_IntervalStyle"] = 2670948;
    var _extra_float_digits = Module["_extra_float_digits"] = 2404152;
    var _pg_crc32_table = Module["_pg_crc32_table"] = 2112352;
    var _xmlFree = Module["_xmlFree"] = 2515640;
    var _shmem_request_hook = Module["_shmem_request_hook"] = 2674212;
    function invoke_iii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iii, "invoke_iii");
    function invoke_viiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiii, "invoke_viiii");
    function invoke_vi(index, a1) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_vi, "invoke_vi");
    function invoke_v(index) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_v, "invoke_v");
    function invoke_j(index) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    __name(invoke_j, "invoke_j");
    function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiiiii, "invoke_viiiiii");
    function invoke_vii(index, a1, a2) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_vii, "invoke_vii");
    function invoke_iiiiii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiii, "invoke_iiiiii");
    function invoke_i(index) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_i, "invoke_i");
    function invoke_ii(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_ii, "invoke_ii");
    function invoke_viii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viii, "invoke_viii");
    function invoke_vji(index, a1, a2) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_vji, "invoke_vji");
    function invoke_iiiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiiiii, "invoke_iiiiiiii");
    function invoke_iiii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiii, "invoke_iiii");
    function invoke_iiiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiii, "invoke_iiiii");
    function invoke_viiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiiiiiiii, "invoke_viiiiiiiii");
    function invoke_viiiii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiiii, "invoke_viiiii");
    function invoke_ji(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    __name(invoke_ji, "invoke_ji");
    function invoke_jiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    __name(invoke_jiiiiiiiii, "invoke_jiiiiiiiii");
    function invoke_jiiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    __name(invoke_jiiiiii, "invoke_jiiiiii");
    function invoke_iiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiiiiiiiiiii, "invoke_iiiiiiiiiiiiii");
    function invoke_viiji(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiji, "invoke_viiji");
    function invoke_iiiijii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiijii, "invoke_iiiijii");
    function invoke_vijiji(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_vijiji, "invoke_vijiji");
    function invoke_viji(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viji, "invoke_viji");
    function invoke_iiji(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiji, "invoke_iiji");
    function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiiiiii, "invoke_iiiiiiiii");
    function invoke_iiiiiiiiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15, a16, a17);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiiiiiiiiiiiiiii, "invoke_iiiiiiiiiiiiiiiiii");
    function invoke_iiiij(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiij, "invoke_iiiij");
    function invoke_jii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    __name(invoke_jii, "invoke_jii");
    function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiiii, "invoke_iiiiiii");
    function invoke_vj(index, a1) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_vj, "invoke_vj");
    function invoke_iiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiiiiiii, "invoke_iiiiiiiiii");
    function invoke_viiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiiiiiii, "invoke_viiiiiiii");
    function invoke_vij(index, a1, a2) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_vij, "invoke_vij");
    function invoke_ij(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_ij, "invoke_ij");
    function invoke_viiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiiiiii, "invoke_viiiiiii");
    function invoke_viiiji(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiiji, "invoke_viiiji");
    function invoke_vid(index, a1, a2) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_vid, "invoke_vid");
    function invoke_ijiiiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_ijiiiiii, "invoke_ijiiiiii");
    function invoke_viijii(index, a1, a2, a3, a4, a5) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viijii, "invoke_viijii");
    function invoke_iiiiiji(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiiji, "invoke_iiiiiji");
    function invoke_viijiiii(index, a1, a2, a3, a4, a5, a6, a7) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viijiiii, "invoke_viijiiii");
    function invoke_viij(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viij, "invoke_viij");
    function invoke_iiij(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiij, "invoke_iiij");
    function invoke_jiiii(index, a1, a2, a3, a4) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
        return 0n;
      }
    }
    __name(invoke_jiiii, "invoke_jiiii");
    function invoke_viiiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_viiiiiiiiiiii, "invoke_viiiiiiiiiiii");
    function invoke_di(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_di, "invoke_di");
    function invoke_id(index, a1) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_id, "invoke_id");
    function invoke_ijiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_ijiiiii, "invoke_ijiiiii");
    function invoke_iiiiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8, a9, a10);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0)
          throw e;
        _setThrew(1, 0);
      }
    }
    __name(invoke_iiiiiiiiiii, "invoke_iiiiiiiiiii");
    Module["addRunDependency"] = addRunDependency;
    Module["removeRunDependency"] = removeRunDependency;
    Module["wasmTable"] = wasmTable;
    Module["addFunction"] = addFunction;
    Module["removeFunction"] = removeFunction;
    Module["setValue"] = setValue;
    Module["getValue"] = getValue;
    Module["UTF8ToString"] = UTF8ToString;
    Module["stringToNewUTF8"] = stringToNewUTF8;
    Module["stringToUTF8OnStack"] = stringToUTF8OnStack;
    Module["FS_createPreloadedFile"] = FS_createPreloadedFile;
    Module["FS_unlink"] = FS_unlink;
    Module["FS_createPath"] = FS_createPath;
    Module["FS_createDevice"] = FS_createDevice;
    Module["FS"] = FS;
    Module["FS_createDataFile"] = FS_createDataFile;
    Module["FS_createLazyFile"] = FS_createLazyFile;
    Module["MEMFS"] = MEMFS;
    Module["IDBFS"] = IDBFS;
    var calledRun;
    dependenciesFulfilled = /* @__PURE__ */ __name(function runCaller() {
      if (!calledRun)
        run();
      if (!calledRun)
        dependenciesFulfilled = runCaller;
    }, "runCaller");
    function callMain(args2 = []) {
      var entryFunction = resolveGlobalSymbol("main").sym;
      if (!entryFunction)
        return;
      args2.unshift(thisProgram);
      var argc = args2.length;
      var argv2 = stackAlloc((argc + 1) * 4);
      var argv_ptr = argv2;
      args2.forEach((arg) => {
        HEAPU32[argv_ptr >> 2] = stringToUTF8OnStack(arg);
        argv_ptr += 4;
      });
      HEAPU32[argv_ptr >> 2] = 0;
      try {
        var ret = entryFunction(argc, argv2);
        exitJS(ret, true);
        return ret;
      } catch (e) {
        return handleException(e);
      }
    }
    __name(callMain, "callMain");
    function run(args2 = arguments_) {
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun)
          return;
        calledRun = true;
        Module["calledRun"] = true;
        if (ABORT)
          return;
        initRuntime();
        preMain();
        readyPromiseResolve(Module);
        Module["onRuntimeInitialized"]?.();
        if (shouldRunNow)
          callMain(args2);
        postRun();
      }
      __name(doRun, "doRun");
      if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(() => {
          setTimeout(() => Module["setStatus"](""), 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    __name(run, "run");
    if (Module["preInit"]) {
      if (typeof Module["preInit"] == "function")
        Module["preInit"] = [Module["preInit"]];
      while (Module["preInit"].length > 0) {
        Module["preInit"].pop()();
      }
    }
    var shouldRunNow = true;
    if (Module["noInitialRun"])
      shouldRunNow = false;
    run();
    moduleRtn = readyPromise;
    return moduleRtn;
  };
})();
var pglite_workers_default = Module3;

// src/pglite-local.ts
var PGliteLocal = class {
  mod;
  protocolParser = new D2();
  queryMutex = new Mutex();
  // State
  ready = false;
  closed = false;
  debug;
  // I/O buffers
  outputData = new Uint8Array(0);
  readOffset = 0;
  writeOffset = 0;
  inputData = new Uint8Array(1024 * 1024);
  // Results
  currentResults = [];
  constructor(debug3 = false) {
    this.debug = debug3;
  }
  /**
   * Create a new PGliteLocal instance
   */
  static async create(options) {
    const instance2 = new PGliteLocal(options.debug ?? false);
    await instance2.init(options);
    return instance2;
  }
  log(...args2) {
    if (this.debug) {
      console.log("[pglite-local]", ...args2);
    }
  }
  async init(options) {
    if (!(options.wasmModule instanceof WebAssembly.Module)) {
      throw new Error("wasmModule must be a pre-compiled WebAssembly.Module");
    }
    this.log("Initializing PGlite for Cloudflare Workers");
    this.mod = await this.createModule(options);
    if (typeof this.mod._pgl_initdb !== "function") {
      throw new Error("_pgl_initdb is not a function - WASM module may not be fully initialized");
    }
    this.verifyFilesystemReady();
    this.log("Creating symlink /PG_PREFIX -> /tmp/pglite");
    try {
      try {
        const contents = this.mod.FS.readdir("/PG_PREFIX");
        if (contents.length <= 2) {
          this.mod.FS.rmdir("/PG_PREFIX");
        }
      } catch {
      }
      this.mod.FS.symlink("/tmp/pglite", "/PG_PREFIX");
    } catch (e) {
      const err2 = e;
      this.log("Error creating symlink:", err2.message);
    }
    this.setupCallbacks();
    this.log("Calling _pgl_initdb...");
    let idb;
    try {
      idb = this.mod._pgl_initdb();
    } catch (error3) {
      throw error3;
    }
    if (!idb) {
      throw new Error("INITDB failed");
    }
    if (idb & 1) {
      throw new Error("INITDB: failed to execute");
    }
    this.mod._pgl_backend();
    this.ready = true;
    await this.exec("SET search_path TO public;");
    this.log("PGlite ready");
  }
  /**
   * Create the Emscripten module using the patched PostgresModFactory with pre-compiled WASM
   */
  async createModule(options) {
    const { wasmModule, fsBundle } = options;
    let fsBundleBuffer;
    if (fsBundle instanceof ArrayBuffer) {
      fsBundleBuffer = fsBundle;
    } else if (ArrayBuffer.isView(fsBundle)) {
      fsBundleBuffer = fsBundle.buffer;
    } else if (fsBundle instanceof ReadableStream) {
      fsBundleBuffer = await new Response(fsBundle).arrayBuffer();
    } else {
      fsBundleBuffer = await new Response(fsBundle).arrayBuffer();
    }
    this.log("Creating Emscripten module...");
    const emscriptenOpts = {
      noExitRuntime: true,
      print: this.debug ? (text) => console.log("[PGlite]", text) : () => {
      },
      printErr: this.debug ? (text) => console.error("[PGlite]", text) : () => {
      },
      // Custom WASM instantiation - use the pre-compiled module from static import
      instantiateWasm: (imports, successCallback) => {
        this.log("instantiateWasm called...");
        WebAssembly.instantiate(wasmModule, imports).then((instance2) => {
          this.log("WASM instance created");
          successCallback(instance2, wasmModule);
        }).catch((err2) => {
          console.error("[pglite-local] WASM instantiation failed:", err2);
        });
        return {};
      },
      // Provide pre-loaded data - the Emscripten data loader calls this
      getPreloadedPackage: (remotePackageName, _remotePackageSize) => {
        this.log("getPreloadedPackage:", remotePackageName);
        if (remotePackageName === "pglite.data") {
          return fsBundleBuffer;
        }
        throw new Error(`Unknown package: ${remotePackageName}`);
      }
    };
    try {
      const mod = await pglite_workers_default(emscriptenOpts);
      this.mod = mod;
      return mod;
    } catch (error3) {
      console.error("[pglite-local] PostgresModFactory failed:", error3);
      throw error3;
    }
  }
  setupCallbacks() {
    this.mod._pgliteCallbacks = {
      write: (ptr, length) => {
        return this.handleWrite(ptr, length);
      },
      read: (ptr, maxLength) => {
        return this.handleRead(ptr, maxLength);
      }
    };
    this.log("Callbacks set up via _pgliteCallbacks trampoline");
  }
  /**
   * Verify that the Emscripten filesystem has been properly populated
   */
  verifyFilesystemReady() {
    const criticalFiles = [
      "/tmp/pglite/share/postgresql/postgres.bki",
      "/tmp/pglite/bin/postgres",
      "/tmp/pglite/bin/initdb"
    ];
    const missingFiles = [];
    for (const file of criticalFiles) {
      try {
        const result = this.mod.FS.analyzePath(file);
        if (!result.exists) {
          missingFiles.push(file);
        }
      } catch {
        missingFiles.push(file);
      }
    }
    if (missingFiles.length > 0) {
      throw new Error(
        `PostgreSQL data files not extracted. Missing: ${missingFiles.join(", ")}.`
      );
    }
    this.log("All critical PostgreSQL files verified");
  }
  handleWrite(ptr, length) {
    if (!this.mod || !this.mod.HEAPU8) {
      return -1;
    }
    if (ptr < 0 || length < 0 || ptr + length > this.mod.HEAPU8.length) {
      return -1;
    }
    try {
      const bytes = this.mod.HEAPU8.subarray(ptr, ptr + length);
      this.protocolParser.parse(bytes, (msg) => {
        this.currentResults.push(msg);
      });
      const copied = bytes.slice();
      const requiredSize = this.writeOffset + copied.length;
      if (requiredSize > this.inputData.length) {
        const newSize = Math.max(this.inputData.length * 2, requiredSize);
        const newBuffer = new Uint8Array(Math.min(newSize, 1024 * 1024 * 1024));
        newBuffer.set(this.inputData.subarray(0, this.writeOffset));
        this.inputData = newBuffer;
      }
      this.inputData.set(copied, this.writeOffset);
      this.writeOffset += copied.length;
      return this.inputData.length;
    } catch {
      return -1;
    }
  }
  handleRead(ptr, maxLength) {
    if (!this.mod || !this.mod.HEAP8) {
      return 0;
    }
    try {
      let length = this.outputData.length - this.readOffset;
      if (length > maxLength) {
        length = maxLength;
      }
      if (length <= 0) {
        return 0;
      }
      if (ptr < 0 || ptr + length > this.mod.HEAP8.length) {
        return 0;
      }
      this.mod.HEAP8.set(
        this.outputData.subarray(this.readOffset, this.readOffset + length),
        ptr
      );
      this.readOffset += length;
      return length;
    } catch {
      return 0;
    }
  }
  execProtocolRawSync(message) {
    this.readOffset = 0;
    this.writeOffset = 0;
    this.outputData = message;
    if (this.inputData.length !== 1024 * 1024) {
      this.inputData = new Uint8Array(1024 * 1024);
    }
    this.mod._interactive_one(message.length, message[0]);
    this.outputData = new Uint8Array(0);
    if (this.writeOffset) {
      return this.inputData.subarray(0, this.writeOffset);
    }
    return new Uint8Array(0);
  }
  async execProtocol(message) {
    this.currentResults = [];
    const data = this.execProtocolRawSync(message);
    const result = { messages: this.currentResults, data };
    this.currentResults = [];
    return result;
  }
  /**
   * Execute a SQL query and return parsed results
   */
  async query(sql) {
    if (!this.ready) {
      throw new Error("PGlite is not ready");
    }
    return this.queryMutex.runExclusive(async () => {
      const message = De.query(sql);
      const { messages } = await this.execProtocol(
        new Uint8Array(message.buffer)
      );
      let rowDescription = null;
      const rows = [];
      let affectedRows = 0;
      const fields = [];
      for (const msg of messages) {
        if (msg.name === "error") {
          const error3 = msg;
          throw new Error(`PostgreSQL error: ${error3.message}`);
        }
        if (msg.name === "rowDescription") {
          rowDescription = msg;
          for (const field of rowDescription.fields) {
            fields.push({ name: field.name, dataTypeID: field.dataTypeID });
          }
        } else if (msg.name === "dataRow" && rowDescription) {
          const row = {};
          const dataRow = msg;
          for (let i2 = 0; i2 < rowDescription.fields.length; i2++) {
            const field = rowDescription.fields[i2];
            const value = dataRow.fields[i2];
            row[field.name] = this.parseValue(value, field.dataTypeID);
          }
          rows.push(row);
        } else if (msg.name === "commandComplete") {
          const cmdMsg = msg;
          const match2 = cmdMsg.text.match(/\d+$/);
          if (match2) {
            affectedRows = parseInt(match2[0], 10);
          }
        }
      }
      return {
        rows,
        affectedRows,
        ...fields.length > 0 && { fields }
      };
    });
  }
  parseValue(value, dataTypeID) {
    if (value === null)
      return null;
    switch (dataTypeID) {
      case 16:
        return value === "t" || value === "true";
      case 20:
        return BigInt(value);
      case 21:
      case 23:
        return parseInt(value, 10);
      case 700:
      case 701:
      case 1700:
        return parseFloat(value);
      case 3802:
      case 114:
        return JSON.parse(value);
      case 1082:
      case 1114:
      case 1184:
        return new Date(value);
      case 1009:
      case 1015:
        if (value.startsWith("{") && value.endsWith("}")) {
          return value.slice(1, -1).split(",").filter((s2) => s2.length > 0);
        }
        return value;
      default:
        return value;
    }
  }
  /**
   * Execute SQL without returning results (for DDL/DML)
   */
  async exec(sql) {
    await this.query(sql);
  }
  /**
   * Execute a transaction
   */
  async transaction(callback) {
    if (!this.ready) {
      throw new Error("PGlite is not ready");
    }
    return this.queryMutex.runExclusive(async () => {
      await this.execInternal("BEGIN");
      let closed = false;
      const tx = {
        query: async (sql) => {
          if (closed) {
            throw new Error("Transaction is closed");
          }
          return await this.queryInternal(sql);
        },
        exec: async (sql) => {
          if (closed) {
            throw new Error("Transaction is closed");
          }
          await this.execInternal(sql);
        },
        rollback: async () => {
          if (closed) {
            throw new Error("Transaction is closed");
          }
          await this.execInternal("ROLLBACK");
          closed = true;
        }
      };
      try {
        const result = await callback(tx);
        if (!closed) {
          closed = true;
          await this.execInternal("COMMIT");
        }
        return result;
      } catch (e) {
        if (!closed) {
          await this.execInternal("ROLLBACK");
        }
        throw e;
      }
    });
  }
  async queryInternal(sql) {
    const message = De.query(sql);
    const { messages } = await this.execProtocol(new Uint8Array(message.buffer));
    let rowDescription = null;
    const rows = [];
    let affectedRows = 0;
    const fields = [];
    for (const msg of messages) {
      if (msg.name === "error") {
        const error3 = msg;
        throw new Error(`PostgreSQL error: ${error3.message}`);
      }
      if (msg.name === "rowDescription") {
        rowDescription = msg;
        for (const field of rowDescription.fields) {
          fields.push({ name: field.name, dataTypeID: field.dataTypeID });
        }
      } else if (msg.name === "dataRow" && rowDescription) {
        const row = {};
        const dataRow = msg;
        for (let i2 = 0; i2 < rowDescription.fields.length; i2++) {
          const field = rowDescription.fields[i2];
          const value = dataRow.fields[i2];
          row[field.name] = this.parseValue(value, field.dataTypeID);
        }
        rows.push(row);
      } else if (msg.name === "commandComplete") {
        const cmdMsg = msg;
        const match2 = cmdMsg.text.match(/\d+$/);
        if (match2) {
          affectedRows = parseInt(match2[0], 10);
        }
      }
    }
    return {
      rows,
      affectedRows,
      ...fields.length > 0 && { fields }
    };
  }
  async execInternal(sql) {
    await this.queryInternal(sql);
  }
  /**
   * Close the database connection
   */
  async close() {
    if (this.closed)
      return;
    try {
      await this.execProtocol(De.end());
      this.mod._pgl_shutdown();
      this.mod._pgliteCallbacks = void 0;
    } catch (e) {
      const err2 = e;
      if (err2.name !== "ExitStatus" || err2.status !== 0) {
        throw e;
      }
    }
    this.closed = true;
    this.log("PGlite closed");
  }
  /**
   * Check if database is ready
   */
  get isReady() {
    return this.ready && !this.closed;
  }
};
__name(PGliteLocal, "PGliteLocal");

// worker.ts
import pgliteWasm from "./63e74a962a39acbce6fd98238edc4bc4e7b1f754-pglite.wasm";
import pgliteData from "./eda0ffebea3c5d531ee6fbb02fb7745c1f87145c-pglite.data";
var NotesDO = class {
  constructor(state, env2) {
    this.state = state;
    this.env = env2;
  }
  db = null;
  initPromise = null;
  initialized = false;
  /**
   * Initialize PGLite and create the notes schema
   */
  async init() {
    if (this.initialized && this.db) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = (async () => {
      console.log("[NotesDO] Initializing PGLite...");
      this.db = await PGliteLocal.create({
        wasmModule: pgliteWasm,
        fsBundle: pgliteData,
        debug: false
      });
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          tags TEXT[] DEFAULT '{}',
          archived BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(archived);
        CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
      `);
      const { rows } = await this.db.query("SELECT COUNT(*)::int as count FROM notes");
      if (rows[0].count === 0) {
        await this.db.exec(`
          INSERT INTO notes (id, title, content, tags, archived)
          VALUES (
            'note-welcome',
            'Welcome to PGLite',
            'This is a real PostgreSQL database running in WebAssembly!',
            ARRAY['welcome', 'demo'],
            false
          )
        `);
      }
      this.initialized = true;
      console.log("[NotesDO] PGLite initialized successfully");
    })();
    return this.initPromise;
  }
  /**
   * Handle HTTP requests to the Durable Object
   */
  async fetch(request) {
    try {
      await this.init();
      const url = new URL(request.url);
      const path = url.pathname;
      if (path === "/query" && request.method === "POST") {
        return this.handleQuery(request);
      }
      if (path === "/notes" && request.method === "GET") {
        return this.handleListNotes(url);
      }
      if (path === "/notes" && request.method === "POST") {
        return this.handleCreateNote(request);
      }
      if (path.startsWith("/notes/") && request.method === "GET") {
        const id = path.replace("/notes/", "");
        return this.handleGetNote(id);
      }
      if (path.startsWith("/notes/") && request.method === "PATCH") {
        const id = path.replace("/notes/", "");
        return this.handleUpdateNote(id, request);
      }
      if (path.startsWith("/notes/") && request.method === "DELETE") {
        const id = path.replace("/notes/", "");
        return this.handleDeleteNote(id);
      }
      if (path === "/stats" && request.method === "GET") {
        return this.handleStats();
      }
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error3) {
      console.error("[NotesDO] Error:", error3);
      return new Response(JSON.stringify({
        error: error3 instanceof Error ? error3.message : "Unknown error"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  async handleQuery(request) {
    const body2 = await request.json();
    if (!body2.sql) {
      return new Response(JSON.stringify({ error: "Missing sql" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const result = await this.db.query(body2.sql);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async handleListNotes(url) {
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const archived = url.searchParams.get("archived");
    let sql = "SELECT * FROM notes";
    const conditions = [];
    if (archived !== null) {
      conditions.push(`archived = ${archived === "true"}`);
    }
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY created_at DESC";
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    const { rows } = await this.db.query(sql);
    let countSql = "SELECT COUNT(*)::int as total FROM notes";
    if (conditions.length > 0) {
      countSql += " WHERE " + conditions.join(" AND ");
    }
    const countResult = await this.db.query(countSql);
    const total = countResult.rows[0].total;
    return new Response(JSON.stringify({ notes: rows, total, limit, offset }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async handleCreateNote(request) {
    const body2 = await request.json();
    if (!body2.title) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tags = body2.tags || [];
    const tagsArray = `ARRAY[${tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`;
    await this.db.exec(`
      INSERT INTO notes (id, title, content, tags, archived)
      VALUES (
        '${id}',
        '${(body2.title || "").replace(/'/g, "''")}',
        ${body2.content ? `'${body2.content.replace(/'/g, "''")}'` : "NULL"},
        ${tags.length > 0 ? tagsArray : "'{}'"},
        false
      )
    `);
    const { rows } = await this.db.query(`SELECT * FROM notes WHERE id = '${id}'`);
    return new Response(JSON.stringify(rows[0]), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  }
  async handleGetNote(id) {
    const { rows } = await this.db.query(`SELECT * FROM notes WHERE id = '${id.replace(/'/g, "''")}'`);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "Note not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify(rows[0]), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async handleUpdateNote(id, request) {
    const safeId = id.replace(/'/g, "''");
    const { rows: existing } = await this.db.query(`SELECT * FROM notes WHERE id = '${safeId}'`);
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: "Note not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    const body2 = await request.json();
    const updates = [];
    if (body2.title !== void 0) {
      updates.push(`title = '${body2.title.replace(/'/g, "''")}'`);
    }
    if (body2.content !== void 0) {
      updates.push(`content = ${body2.content === null ? "NULL" : `'${body2.content.replace(/'/g, "''")}'`}`);
    }
    if (body2.tags !== void 0) {
      const tagsArray = `ARRAY[${body2.tags.map((t) => `'${t.replace(/'/g, "''")}'`).join(",")}]::text[]`;
      updates.push(`tags = ${body2.tags.length > 0 ? tagsArray : "'{}'"}`);
    }
    if (body2.archived !== void 0) {
      updates.push(`archived = ${body2.archived}`);
    }
    updates.push("updated_at = NOW()");
    await this.db.exec(`UPDATE notes SET ${updates.join(", ")} WHERE id = '${safeId}'`);
    const { rows } = await this.db.query(`SELECT * FROM notes WHERE id = '${safeId}'`);
    return new Response(JSON.stringify(rows[0]), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async handleDeleteNote(id) {
    const safeId = id.replace(/'/g, "''");
    const { rows: existing } = await this.db.query(`SELECT * FROM notes WHERE id = '${safeId}'`);
    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: "Note not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
    await this.db.exec(`DELETE FROM notes WHERE id = '${safeId}'`);
    return new Response(JSON.stringify({ deleted: true, id }), {
      headers: { "Content-Type": "application/json" }
    });
  }
  async handleStats() {
    const { rows: countRows } = await this.db.query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE archived)::int as archived
      FROM notes
    `);
    const { rows: tagRows } = await this.db.query(`
      SELECT unnest(tags) as tag, COUNT(*)::int as count
      FROM notes
      GROUP BY tag
      ORDER BY count DESC
    `);
    const tagCounts = {};
    for (const row of tagRows) {
      tagCounts[row.tag] = row.count;
    }
    return new Response(JSON.stringify({
      totalNotes: countRows[0].total,
      activeNotes: countRows[0].total - countRows[0].archived,
      archivedNotes: countRows[0].archived,
      tagCounts,
      database: "PGLite (real PostgreSQL)",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
__name(NotesDO, "NotesDO");
var app = new Hono2();
function respond(c3, data, status = 200) {
  return c3.json({
    api: {
      name: c3.env.API_NAME || "postgres.example.com.ai",
      url: new URL(c3.req.url).origin
    },
    data
  }, status);
}
__name(respond, "respond");
function getNotesDO(env2) {
  const id = env2.NOTES_DO.idFromName("notes");
  return env2.NOTES_DO.get(id);
}
__name(getNotesDO, "getNotesDO");
app.get("/", (c3) => {
  const baseUrl = new URL(c3.req.url).origin;
  return respond(c3, {
    name: "postgres.example.com.ai",
    description: "PGLite PostgreSQL example with real PostgreSQL in WebAssembly",
    version: "2.0.0",
    features: [
      "Real PostgreSQL via PGLite WASM",
      "Durable Objects for persistence",
      "PostgreSQL arrays and full SQL support",
      "Raw SQL query execution"
    ],
    endpoints: {
      health: {
        url: `${baseUrl}/health`,
        method: "GET",
        description: "Check database health and connection status"
      },
      notes: {
        list: {
          url: `${baseUrl}/notes`,
          method: "GET",
          description: "List all notes with pagination",
          params: ["limit", "offset", "archived"]
        },
        create: {
          url: `${baseUrl}/notes`,
          method: "POST",
          description: "Create a new note",
          body: { title: "string (required)", content: "string", tags: "string[]" }
        },
        get: {
          url: `${baseUrl}/notes/:id`,
          method: "GET",
          description: "Get a single note by ID"
        },
        update: {
          url: `${baseUrl}/notes/:id`,
          method: "PATCH",
          description: "Update a note",
          body: { title: "string", content: "string", tags: "string[]", archived: "boolean" }
        },
        delete: {
          url: `${baseUrl}/notes/:id`,
          method: "DELETE",
          description: "Delete a note"
        }
      },
      stats: {
        url: `${baseUrl}/stats`,
        method: "GET",
        description: "Get database statistics including note counts and tag usage"
      },
      query: {
        url: `${baseUrl}/query`,
        method: "POST",
        description: "Execute raw SQL queries against the PostgreSQL database",
        body: { sql: "string (required)" },
        examples: [
          { sql: "SELECT version()" },
          { sql: "SELECT * FROM notes ORDER BY created_at DESC LIMIT 5" },
          { sql: "SELECT unnest(tags) as tag, COUNT(*) FROM notes GROUP BY tag" }
        ]
      }
    },
    tryIt: {
      description: "Quick examples to try with curl:",
      examples: [
        `curl ${baseUrl}/health`,
        `curl ${baseUrl}/notes`,
        `curl ${baseUrl}/stats`,
        `curl -X POST ${baseUrl}/query -H "Content-Type: application/json" -d '{"sql": "SELECT version()"}'`,
        `curl -X POST ${baseUrl}/notes -H "Content-Type: application/json" -d '{"title": "My Note", "content": "Hello PostgreSQL!", "tags": ["test"]}'`
      ]
    }
  });
});
app.get("/health", async (c3) => {
  try {
    const stub = getNotesDO(c3.env);
    const response = await stub.fetch(new Request("http://internal/stats"));
    const stats = await response.json();
    return respond(c3, {
      status: "ok",
      database: "PGLite (real PostgreSQL)",
      totalNotes: stats.totalNotes,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error3) {
    return respond(c3, {
      status: "error",
      database: "PGLite (initializing)",
      error: error3 instanceof Error ? error3.message : "Unknown error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, 503);
  }
});
app.get("/notes", async (c3) => {
  const stub = getNotesDO(c3.env);
  const url = new URL(c3.req.url);
  const response = await stub.fetch(new Request(`http://internal/notes${url.search}`));
  const data = await response.json();
  return respond(c3, data);
});
app.post("/notes", async (c3) => {
  const stub = getNotesDO(c3.env);
  const body2 = await c3.req.text();
  const response = await stub.fetch(new Request("http://internal/notes", {
    method: "POST",
    body: body2,
    headers: { "Content-Type": "application/json" }
  }));
  const data = await response.json();
  return respond(c3, data, response.status);
});
app.get("/notes/:id", async (c3) => {
  const stub = getNotesDO(c3.env);
  const id = c3.req.param("id");
  const response = await stub.fetch(new Request(`http://internal/notes/${id}`));
  const data = await response.json();
  return respond(c3, data, response.status);
});
app.patch("/notes/:id", async (c3) => {
  const stub = getNotesDO(c3.env);
  const id = c3.req.param("id");
  const body2 = await c3.req.text();
  const response = await stub.fetch(new Request(`http://internal/notes/${id}`, {
    method: "PATCH",
    body: body2,
    headers: { "Content-Type": "application/json" }
  }));
  const data = await response.json();
  return respond(c3, data, response.status);
});
app.delete("/notes/:id", async (c3) => {
  const stub = getNotesDO(c3.env);
  const id = c3.req.param("id");
  const response = await stub.fetch(new Request(`http://internal/notes/${id}`, {
    method: "DELETE"
  }));
  const data = await response.json();
  return respond(c3, data, response.status);
});
app.get("/stats", async (c3) => {
  const stub = getNotesDO(c3.env);
  const response = await stub.fetch(new Request("http://internal/stats"));
  const data = await response.json();
  return respond(c3, data);
});
app.post("/query", async (c3) => {
  const stub = getNotesDO(c3.env);
  const body2 = await c3.req.text();
  const response = await stub.fetch(new Request("http://internal/query", {
    method: "POST",
    body: body2,
    headers: { "Content-Type": "application/json" }
  }));
  const data = await response.json();
  return respond(c3, data, response.status);
});
var worker_default = app;
export {
  NotesDO,
  worker_default as default
};
//# sourceMappingURL=worker.js.map
