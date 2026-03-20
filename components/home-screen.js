"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomeScreen;
var vector_icons_1 = require("@expo/vector-icons");
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var theme_1 = require("@/constants/theme");
var use_api_1 = require("@/hooks/use-api");
var use_color_scheme_1 = require("@/hooks/use-color-scheme");
var use_session_1 = require("@/hooks/use-session");
function pad2(v) { return v.toString().padStart(2, '0'); }
function toLocalDateKey(d) { return "".concat(d.getFullYear(), "-").concat(pad2(d.getMonth() + 1), "-").concat(pad2(d.getDate())); }
function drawDateFromKey(key) {
    var _a = key.split('-').map(Number), y = _a[0], m = _a[1], d = _a[2];
    return new Date(y, m - 1, d, 21, 0, 0, 0);
}
function getNextDrawAt(ref) {
    var draw = new Date(ref);
    draw.setHours(21, 0, 0, 0);
    if (ref.getTime() >= draw.getTime())
        draw.setDate(draw.getDate() + 1);
    return draw;
}
function getLatestSettledDrawAt(ref) {
    var draw = new Date(ref);
    draw.setHours(21, 0, 0, 0);
    if (ref.getTime() < draw.getTime())
        draw.setDate(draw.getDate() - 1);
    return draw;
}
function getCountdownLabel(target, now) {
    var ms = target.getTime() - now.getTime();
    if (ms <= 0)
        return 'Draw lock in progress';
    var total = Math.floor(ms / 1000);
    return "".concat(pad2(Math.floor(total / 3600)), ":").concat(pad2(Math.floor((total % 3600) / 60)), ":").concat(pad2(total % 60));
}
function seededRandom(seed) {
    var hash = 2166136261;
    for (var i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return function () {
        hash += hash << 13;
        hash ^= hash >>> 7;
        hash += hash << 3;
        hash ^= hash >>> 17;
        hash += hash << 5;
        return (hash >>> 0) / 4294967295;
    };
}
function pickUniqueNumbers(max, count, rand) {
    if (rand === void 0) { rand = Math.random; }
    var picked = new Set();
    while (picked.size < count)
        picked.add(Math.floor(rand() * max) + 1);
    return Array.from(picked).sort(function (a, b) { return a - b; });
}
function getGameType(gameId) {
    if (gameId === '2d-ez2')
        return '2number';
    if (gameId === '3d-swertres')
        return '3digit';
    if (gameId === '4digit')
        return '4digit';
    if (gameId === '6digit')
        return '6digit';
    return '6number';
}
function isDigitGame(gameType) {
    return gameType === '3digit' || gameType === '4digit' || gameType === '6digit';
}
function getRequiredDigits(gameType) {
    switch (gameType) {
        case '2number': return 2;
        case '3digit': return 3;
        case '4digit': return 4;
        case '6digit': return 6;
        case '6number': return 6;
    }
}
function buildOfficialNumbers(game, key) {
    var gameType = getGameType(game.id);
    var requiredCount = getRequiredDigits(gameType);
    var isDigit = isDigitGame(gameType);
    if (isDigit) {
        // 3D, 4D, 6D: Generate random digits 0-9
        var result = [];
        var rand = seededRandom("pcso:".concat(game.id, ":").concat(key));
        for (var i = 0; i < requiredCount; i++) {
            result.push(Math.floor(rand() * 10));
        }
        return result;
    }
    else if (gameType === '2number') {
        // 2D: Pick 2 numbers (can repeat) from 1 to maxNumber
        var result = [];
        var rand = seededRandom("pcso:".concat(game.id, ":").concat(key));
        for (var i = 0; i < 2; i++) {
            result.push(Math.floor(rand() * game.maxNumber) + 1);
        }
        return result;
    }
    else {
        // 6-number games: Pick 6 unique numbers
        return pickUniqueNumbers(game.maxNumber, 6, seededRandom("pcso:".concat(game.id, ":").concat(key)));
    }
}
function formatCurrency(v) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}
var MIN_STAKE = 20;
var MAX_STAKE = 500;
var MAJOR_LOTTO_IDS = ['ultra-658', 'grand-655', 'super-649', 'mega-645', 'lotto-642'];
var SMALL_GAME_IDS = ['6digit', '4digit', '3d-swertres', '2d-ez2'];
function HomeScreen() {
    var _this = this;
    var _a, _b, _c;
    var session = (0, use_session_1.useSession)().session;
    var colorScheme = (0, use_color_scheme_1.useColorScheme)();
    var uid = (_a = session === null || session === void 0 ? void 0 : session.userId) !== null && _a !== void 0 ? _a : null;
    var displayName = (_b = session === null || session === void 0 ? void 0 : session.displayName) !== null && _b !== void 0 ? _b : 'Player';
    var isDemoUser = (_c = session === null || session === void 0 ? void 0 : session.demo) !== null && _c !== void 0 ? _c : false;
    // Games from API
    var _d = (0, react_1.useState)([]), games = _d[0], setGames = _d[1];
    var _e = (0, react_1.useState)(true), gamesLoading = _e[0], setGamesLoading = _e[1];
    // Balance from API
    var _f = (0, react_1.useState)(0), balance = _f[0], setBalance = _f[1];
    var _g = (0, react_1.useState)(true), balanceLoading = _g[0], setBalanceLoading = _g[1];
    var _h = (0, react_1.useState)(''), selectedGameId = _h[0], setSelectedGameId = _h[1];
    var _j = (0, react_1.useState)('manual'), betMode = _j[0], setBetMode = _j[1];
    var _k = (0, react_1.useState)([]), selectedNumbers = _k[0], setSelectedNumbers = _k[1];
    var _l = (0, react_1.useState)(MIN_STAKE), stake = _l[0], setStake = _l[1];
    var _m = (0, react_1.useState)('Select a game, pick six numbers, and place your demo bet.'), notice = _m[0], setNotice = _m[1];
    var _o = (0, react_1.useState)(function () { return new Date(); }), now = _o[0], setNow = _o[1];
    var _p = (0, react_1.useState)(false), placingBet = _p[0], setPlacingBet = _p[1];
    var boardPulse = (0, react_1.useRef)(new react_native_1.Animated.Value(1)).current;
    var jackpotScroll = (0, react_1.useRef)(null);
    var scrollViewRef = (0, react_1.useRef)(null);
    var betBuilderRef = (0, react_1.useRef)(null);
    var _q = (0, react_1.useState)(0), jackpotIndex = _q[0], setJackpotIndex = _q[1];
    // Clock
    (0, react_1.useEffect)(function () {
        var t = setInterval(function () { return setNow(new Date()); }, 1000);
        return function () { return clearInterval(t); };
    }, []);
    // Load games — today only
    (0, react_1.useEffect)(function () {
        (0, use_api_1.apiFetch)('/games')
            .then(function (data) {
            var _a, _b, _c;
            setGames(data);
            var firstMajor = data.find(function (g) { return MAJOR_LOTTO_IDS.includes(g.id); });
            setSelectedGameId((_c = (_a = firstMajor === null || firstMajor === void 0 ? void 0 : firstMajor.id) !== null && _a !== void 0 ? _a : (_b = data[0]) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : '');
        })
            .catch(function () { return setNotice('Could not load games. Is the server running?'); })
            .finally(function () { return setGamesLoading(false); });
    }, []);
    // Load balance
    (0, react_1.useEffect)(function () {
        if (!uid) {
            setBalanceLoading(false);
            return;
        }
        (0, use_api_1.apiFetch)('/bets/balance', { userId: uid })
            .then(function (r) { return setBalance(Number(r.balance)); })
            .catch(function () { })
            .finally(function () { return setBalanceLoading(false); });
    }, [uid]);
    var selectedGame = (0, react_1.useMemo)(function () { var _a; return (_a = games.find(function (g) { return g.id === selectedGameId; })) !== null && _a !== void 0 ? _a : games[0]; }, [games, selectedGameId]);
    var majorGames = (0, react_1.useMemo)(function () { return MAJOR_LOTTO_IDS.map(function (id) { return games.find(function (g) { return g.id === id; }); }).filter(function (g) { return g !== undefined; }); }, [games]);
    var smallGames = (0, react_1.useMemo)(function () { return SMALL_GAME_IDS.map(function (id) { return games.find(function (g) { return g.id === id; }); }).filter(function (g) { return g !== undefined; }); }, [games]);
    var numberOptions = (0, react_1.useMemo)(function () {
        if (!selectedGame)
            return [];
        var gameType = getGameType(selectedGame.id);
        var isDigit = isDigitGame(gameType);
        if (isDigit) {
            // 3D, 4D, 6D: Show digits 0-9
            return Array.from({ length: 10 }, function (_, i) { return i; });
        }
        else {
            // 2D and 6-number games: Show range 1 to maxNumber
            return Array.from({ length: selectedGame.maxNumber }, function (_, i) { return i + 1; });
        }
    }, [selectedGame]);
    (0, react_1.useEffect)(function () { setSelectedNumbers([]); }, [selectedGameId]);
    var nextDrawAt = getNextDrawAt(now);
    var nextDrawDateKey = toLocalDateKey(nextDrawAt);
    var nextDrawLabel = nextDrawAt.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
    var latestSettledDrawAt = getLatestSettledDrawAt(now);
    var latestSettledDrawKey = toLocalDateKey(latestSettledDrawAt);
    var latestOfficialNumbers = selectedGame ? buildOfficialNumbers(selectedGame, latestSettledDrawKey) : [];
    var countdownLabel = getCountdownLabel(nextDrawAt, now);
    var selectedBallSet = new Set(selectedNumbers);
    var palette = colorScheme === 'dark'
        ? {
            screenBg: '#08152c', cardBg: '#0f2344', cardBorder: '#23477e', heroBg: '#0d3a78',
            heroText: '#edf4ff', heroTextSoft: '#a9c2e6', heroStageBg: '#0a1b35',
            textStrong: '#edf4ff', textSoft: '#a9c2e6', accent: '#f4b400', accentText: '#2e2604',
            secondaryButton: '#1a63c2', secondaryButtonText: '#ecf4ff',
            chipIdle: '#14315f', chipIdleText: '#bdd2ef', chipActive: '#f4b400', chipActiveText: '#2f2706',
            numberIdle: '#1e4a8a', numberIdleText: '#e0ebff', numberSelected: '#f4b400', numberSelectedText: '#2f2606',
            ticketPending: '#0e4b9b', ticketWon: '#0f8455', ticketLost: '#8d2f3e',
            orbOne: '#0e2d5d', orbTwo: '#123c73', stageBg: '#0a1b35', payout: '#84e4b7', warning: '#ffb670',
        }
        : {
            screenBg: '#edf3ff', cardBg: '#ffffff', cardBorder: '#cadbf5', heroBg: '#0f4ea9',
            heroText: '#ffffff', heroTextSoft: 'rgba(255,255,255,0.72)', heroStageBg: 'rgba(255,255,255,0.15)',
            textStrong: '#15305e', textSoft: '#5a7299', accent: '#f4b400', accentText: '#342906',
            secondaryButton: '#1260c4', secondaryButtonText: '#eff5ff',
            chipIdle: '#e3edfd', chipIdleText: '#335d92', chipActive: '#f4b400', chipActiveText: '#332905',
            numberIdle: '#d6e5ff', numberIdleText: '#1e3a6b', numberSelected: '#f4b400', numberSelectedText: '#342906',
            ticketPending: '#dbeafe', ticketWon: '#d5f5e7', ticketLost: '#ffe1e4',
            orbOne: '#cadffd', orbTwo: '#dde9ff', stageBg: '#f2f7ff', payout: '#0f7a4f', warning: '#a86000',
        };
    var triggerBoardPulse = function () {
        react_native_1.Animated.sequence([
            react_native_1.Animated.timing(boardPulse, { toValue: 0.97, duration: 110, useNativeDriver: true }),
            react_native_1.Animated.timing(boardPulse, { toValue: 1, duration: 170, useNativeDriver: true }),
        ]).start();
    };
    var createLuckyPick = function () {
        if (!selectedGame)
            return;
        var gameType = getGameType(selectedGame.id);
        var requiredCount = getRequiredDigits(gameType);
        var isDigit = isDigitGame(gameType);
        var nums;
        if (gameType === '6number') {
            // 6-number games: 6 unique numbers
            nums = pickUniqueNumbers(selectedGame.maxNumber, 6);
        }
        else if (isDigit || gameType === '2number') {
            // 2D, 3D, 4D, 6D: Random digits 0-9 (can repeat)
            nums = [];
            for (var i = 0; i < requiredCount; i++) {
                nums.push(Math.floor(Math.random() * 10));
            }
        }
        setSelectedNumbers(nums);
        setNotice("Lucky pick ready: ".concat(nums.join(' - ')));
        triggerBoardPulse();
    };
    var toggleManualNumber = function (v) {
        if (betMode !== 'manual')
            return;
        var gameType = getGameType((selectedGame === null || selectedGame === void 0 ? void 0 : selectedGame.id) || '');
        var requiredCount = getRequiredDigits(gameType);
        var allowsDuplicates = gameType !== '6number'; // 2D, 3D, 4D, 6D allow duplicates
        setSelectedNumbers(function (cur) {
            if (allowsDuplicates) {
                // For 2D, 3D, 4D, 6D: Allow duplicates, just keep adding
                if (cur.length >= requiredCount)
                    return cur;
                return __spreadArray(__spreadArray([], cur, true), [v], false);
            }
            else {
                // For 6-number games: No duplicates, toggle on/off
                if (cur.includes(v))
                    return cur.filter(function (n) { return n !== v; });
                if (cur.length >= requiredCount)
                    return cur;
                return __spreadArray(__spreadArray([], cur, true), [v], false).sort(function (a, b) { return a - b; });
            }
        });
    };
    var changeStake = function (delta) {
        setStake(function (cur) { return Math.min(MAX_STAKE, Math.max(MIN_STAKE, cur + delta)); });
    };
    var selectGame = function (id) {
        setSelectedGameId(id);
        setTimeout(function () {
            var _a;
            (_a = betBuilderRef.current) === null || _a === void 0 ? void 0 : _a.measureLayout(scrollViewRef.current, function (_x, y) { var _a; (_a = scrollViewRef.current) === null || _a === void 0 ? void 0 : _a.scrollTo({ y: y, animated: true }); }, function () { });
        }, 50);
    };
    var placeBet = function () { return __awaiter(_this, void 0, void 0, function () {
        var drawCutoff, gameType, requiredCount, isDigit, activeNumbers, i, label, e_1, styles;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!selectedGame || !uid) {
                        setNotice('Session error. Please log in again.');
                        return [2 /*return*/];
                    }
                    drawCutoff = drawDateFromKey(nextDrawDateKey);
                    if (now.getTime() >= drawCutoff.getTime()) {
                        setNotice('Betting is locked for this draw. Please wait for the next 9:00 PM round.');
                        return [2 /*return*/];
                    }
                    gameType = getGameType(selectedGame.id);
                    requiredCount = getRequiredDigits(gameType);
                    isDigit = isDigitGame(gameType);
                    activeNumbers = selectedNumbers;
                    if (!(betMode === 'lucky')) return [3 /*break*/, 6];
                    if (!(activeNumbers.length !== requiredCount)) return [3 /*break*/, 5];
                    if (gameType === '6number') {
                        activeNumbers = pickUniqueNumbers(selectedGame.maxNumber, 6);
                    }
                    else if (isDigit || gameType === '2number') {
                        // 2D, 3D, 4D, 6D: Random digits 0-9
                        activeNumbers = [];
                        for (i = 0; i < requiredCount; i++) {
                            activeNumbers.push(Math.floor(Math.random() * 10));
                        }
                    }
                    if (activeNumbers.length !== requiredCount) {
                        label = requiredCount === 1 ? 'number' : 'numbers';
                        setNotice("Select exactly ".concat(requiredCount, " ").concat(label, " before placing your bet."));
                        return [2 /*return*/];
                    }
                    if (balance < stake) {
                        setNotice('Insufficient demo credits. Lower your stake or reset the app session.');
                        return [2 /*return*/];
                    }
                    setPlacingBet(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, use_api_1.apiFetch)('/bets', {
                            method: 'POST',
                            userId: uid,
                            body: { gameId: selectedGame.id, numbers: activeNumbers, stake: stake },
                        })];
                case 2:
                    _a.sent();
                    setBalance(function (cur) { return cur - stake; });
                    setNotice("Bet placed for ".concat(selectedGame.name, " on ").concat(nextDrawDateKey, " 9:00 PM. Stake: ").concat(formatCurrency(stake), "."));
                    if (betMode === 'manual')
                        setSelectedNumbers([]);
                    else
                        setSelectedNumbers(activeNumbers);
                    triggerBoardPulse();
                    return [3 /*break*/, 5];
                case 3:
                    e_1 = _a.sent();
                    setNotice(e_1 instanceof Error ? e_1.message : 'Failed to place bet.');
                    return [3 /*break*/, 5];
                case 4:
                    setPlacingBet(false);
                    return [7 /*endfinally*/];
                case 5:
                    ;
                    return [2 /*return*/, (<react_native_safe_area_context_1.SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screenBg }]}>
      <react_native_1.View style={[styles.orbTop, { backgroundColor: palette.orbOne }]}/>
      <react_native_1.View style={[styles.orbBottom, { backgroundColor: palette.orbTwo }]}/>

      <react_native_1.ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <react_native_1.View style={[styles.heroCard, { backgroundColor: palette.heroBg }]}>
          <react_native_1.View style={styles.heroRow}>
            <react_native_1.View>
              <react_native_1.Text style={[styles.heroTag, { color: 'rgba(255,255,255,0.70)' }]}>PCSO LOTTO SIMULATOR</react_native_1.Text>
              <react_native_1.Text style={[styles.heroTitle, { color: '#ffffff' }]}>{displayName}</react_native_1.Text>
              <react_native_1.Text style={[styles.heroSubTitle, { color: 'rgba(255,255,255,0.70)' }]}>Daily 9:00 PM draw tracking</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.View style={styles.heroStatsRow}>
            <react_native_1.View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <react_native_1.Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.70)' }]}>Demo Balance</react_native_1.Text>
              {balanceLoading
                                ? <react_native_1.ActivityIndicator color={palette.accent} style={{ marginTop: 5 }}/>
                                : <react_native_1.Text style={[styles.heroStatValue, { color: palette.accent }]}>{formatCurrency(balance)}</react_native_1.Text>}
            </react_native_1.View>
            <react_native_1.View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <react_native_1.Text style={[styles.heroStatLabel, { color: 'rgba(255,255,255,0.70)' }]}>Next Draw</react_native_1.Text>
              <react_native_1.Text style={[styles.heroStatValue, { color: palette.accent }]}>{countdownLabel}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.Text style={[styles.drawMeta, { color: 'rgba(255,255,255,0.70)' }]}>Draw lock: {nextDrawLabel}</react_native_1.Text>
          <react_native_1.Text style={[styles.drawSource, { color: 'rgba(255,255,255,0.70)' }]}>Result basis: official 9:00 PM schedule.</react_native_1.Text>

          {isDemoUser && (<react_native_1.View style={[styles.demoBadge, { backgroundColor: palette.accent }]}>
              <vector_icons_1.Ionicons name="person-circle-outline" size={14} color={palette.accentText}/>
              <react_native_1.Text style={[styles.demoBadgeText, { color: palette.accentText }]}>Demo Account Active</react_native_1.Text>
            </react_native_1.View>)}
        </react_native_1.View>

        {/* Jackpot Showcase */}
        {!gamesLoading && games.length > 0 && (<react_native_1.View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Tonight's Jackpots</react_native_1.Text>
            <react_native_1.Text style={[styles.jackpotSubtitle, { color: palette.textSoft }]}>
              {now.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })} · 9:00 PM Draw
            </react_native_1.Text>
            <react_native_1.ScrollView ref={jackpotScroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={function (e) {
                                    var idx = Math.round(e.nativeEvent.contentOffset.x / 260);
                                    setJackpotIndex(idx);
                                }} style={{ marginTop: 12 }}>
              {majorGames.map(function (g) { return (<react_native_1.Pressable key={g.id} onPress={function () { return selectGame(g.id); }} style={[styles.jackpotCard, { backgroundColor: palette.heroBg }]}>
                  <react_native_1.View>
                    <react_native_1.Text style={[styles.jackpotGameName, { color: 'rgba(255,255,255,0.75)' }]}>{g.name}</react_native_1.Text>
                    <react_native_1.Text style={[styles.jackpotAmount, { color: palette.accent }]}>
                      {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(g.jackpot)}
                    </react_native_1.Text>
                    <react_native_1.Text style={[styles.jackpotLabel, { color: 'rgba(255,255,255,0.55)' }]}>Estimated Jackpot</react_native_1.Text>
                    <react_native_1.Text style={[styles.jackpotStatus, { color: palette.warning }]}>{g.jackpotStatus}</react_native_1.Text>
                    <react_native_1.View style={[styles.jackpotBetBtn, { backgroundColor: palette.accent }]}>
                      <react_native_1.Text style={[styles.jackpotBetBtnText, { color: palette.accentText }]}>Bet Now</react_native_1.Text>
                    </react_native_1.View>
                  </react_native_1.View>
                </react_native_1.Pressable>); })}
            </react_native_1.ScrollView>
            {majorGames.length > 1 && (<react_native_1.View style={styles.dotRow}>
                {majorGames.map(function (_, i) { return (<react_native_1.View key={i} style={[styles.dot, { backgroundColor: i === jackpotIndex ? palette.accent : palette.chipIdle }]}/>); })}
              </react_native_1.View>)}
          </react_native_1.View>)}

        {/* Game Picker */}
        <react_native_1.View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <react_native_1.Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Choose Lotto Game</react_native_1.Text>
          {gamesLoading
                                ? <react_native_1.ActivityIndicator color={palette.accent} style={{ marginTop: 12 }}/>
                                : (<>
                <react_native_1.View style={styles.categorySection}>
                  <react_native_1.Text style={[styles.categoryLabel, { color: palette.textSoft }]}>Major Lotto Games</react_native_1.Text>
                  <react_native_1.View style={styles.gameGrid}>
                    {majorGames.map(function (game) {
                                        var active = game.id === (selectedGame === null || selectedGame === void 0 ? void 0 : selectedGame.id);
                                        return (<react_native_1.Pressable key={game.id} onPress={function () { return selectGame(game.id); }} style={[styles.gameChip, { backgroundColor: active ? palette.chipActive : palette.chipIdle }]}>
                          <react_native_1.View>
                            <react_native_1.Text style={[styles.gameChipLabel, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>{game.name}</react_native_1.Text>
                            <react_native_1.Text style={[styles.gameChipSub, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>{game.drawTime}</react_native_1.Text>
                          </react_native_1.View>
                        </react_native_1.Pressable>);
                                    })}
                  </react_native_1.View>
                </react_native_1.View>
                <react_native_1.View style={[styles.categorySection, { marginTop: 10 }]}>
                  <react_native_1.Text style={[styles.categoryLabel, { color: palette.textSoft }]}>3D / 4D Games</react_native_1.Text>
                  <react_native_1.View style={styles.gameGrid}>
                    {smallGames.map(function (game) {
                                        var active = game.id === (selectedGame === null || selectedGame === void 0 ? void 0 : selectedGame.id);
                                        return (<react_native_1.Pressable key={game.id} onPress={function () { return selectGame(game.id); }} style={[styles.gameChip, { backgroundColor: active ? palette.chipActive : palette.chipIdle }]}>
                          <react_native_1.View>
                            <react_native_1.Text style={[styles.gameChipLabel, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>{game.name}</react_native_1.Text>
                            <react_native_1.Text style={[styles.gameChipSub, { color: active ? palette.chipActiveText : palette.chipIdleText }]}>{game.drawTime}</react_native_1.Text>
                          </react_native_1.View>
                        </react_native_1.Pressable>);
                                    })}
                  </react_native_1.View>
                </react_native_1.View>
              </>)}
        </react_native_1.View>

        {/* Bet Builder */}
        <react_native_1.Animated.View ref={betBuilderRef} style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder, transform: [{ scale: boardPulse }] }]}>
          <react_native_1.Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Build Your Bet Slip</react_native_1.Text>

          <react_native_1.View style={styles.modeRow}>
            {['manual', 'lucky'].map(function (mode) { return (<react_native_1.Pressable key={mode} style={[styles.modeChip, { backgroundColor: betMode === mode ? palette.chipActive : palette.chipIdle }]} onPress={function () { setBetMode(mode); if (mode === 'lucky')
                                createLuckyPick(); }}>
                <react_native_1.Text style={[styles.modeChipText, { color: betMode === mode ? palette.chipActiveText : palette.chipIdleText }]}>
                  {mode === 'manual' ? 'Manual Pick' : 'Lucky Pick'}
                </react_native_1.Text>
              </react_native_1.Pressable>); })}
          </react_native_1.View>

          {betMode === 'lucky' && (<react_native_1.Pressable style={[styles.luckyButton, { backgroundColor: palette.secondaryButton }]} onPress={createLuckyPick}>
              <vector_icons_1.Ionicons name="shuffle-outline" size={16} color={palette.secondaryButtonText}/>
              <react_native_1.Text style={[styles.luckyButtonText, { color: palette.secondaryButtonText }]}>Generate New Lucky Pick</react_native_1.Text>
            </react_native_1.Pressable>)}

          {selectedGame && (function () {
                                var _a, _b;
                                var gameType = getGameType(selectedGame.id);
                                var requiredCount = getRequiredDigits(gameType);
                                var isDigit = isDigitGame(gameType);
                                var is2D = gameType === '2number';
                                var is3D4D6D = isDigit;
                                var itemLabel = isDigit ? 'digit' : 'number';
                                return (<>
                {is2D ? (<react_native_1.View>
                    <react_native_1.View style={styles.selectionTray}>
                      {selectedNumbers.length > 0 ? (<react_native_1.View style={[styles.selectionBall, { backgroundColor: palette.stageBg }]}>
                          <react_native_1.Text style={[styles.selectionBallText, { color: palette.textStrong }]}>
                            {(_a = selectedNumbers[0]) !== null && _a !== void 0 ? _a : '-'} - {(_b = selectedNumbers[1]) !== null && _b !== void 0 ? _b : '-'}
                          </react_native_1.Text>
                        </react_native_1.View>) : (<react_native_1.View style={[styles.selectionBall, { backgroundColor: palette.stageBg }]}>
                          <react_native_1.Text style={[styles.selectionBallText, { color: palette.textSoft }]}>-- - --</react_native_1.Text>
                        </react_native_1.View>)}
                    </react_native_1.View>
                    <react_native_1.Text style={[styles.selectionHint, { color: palette.textSoft }]}>
                      Selected {selectedNumbers.length} of 2 digits
                    </react_native_1.Text>
                  </react_native_1.View>) : is3D4D6D ? (<react_native_1.View>
                    <react_native_1.View style={styles.selectionTray}>
                      {selectedNumbers.length > 0 ? (<react_native_1.View style={[styles.selectionBall, { backgroundColor: palette.stageBg }]}>
                          <react_native_1.Text style={[styles.selectionBallText, { color: palette.textStrong }]}>
                            {selectedNumbers.join('-')}
                          </react_native_1.Text>
                        </react_native_1.View>) : (<react_native_1.View style={[styles.selectionBall, { backgroundColor: palette.stageBg }]}>
                          <react_native_1.Text style={[styles.selectionBallText, { color: palette.textSoft }]}>
                            {Array.from({ length: requiredCount }, function () { return '-'; }).join('-')}
                          </react_native_1.Text>
                        </react_native_1.View>)}
                    </react_native_1.View>
                    <react_native_1.Text style={[styles.selectionHint, { color: palette.textSoft }]}>
                      Selected {selectedNumbers.length} of {requiredCount} {requiredCount === 1 ? itemLabel : itemLabel + 's'}
                    </react_native_1.Text>
                  </react_native_1.View>) : (<>
                    <react_native_1.View style={styles.selectionTray}>
                      {Array.from({ length: requiredCount }).map(function (_, i) {
                                            var v = selectedNumbers[i];
                                            return (<react_native_1.View key={"slot-".concat(i)} style={[styles.selectionBall, { backgroundColor: palette.stageBg }]}>
                            <react_native_1.Text style={[styles.selectionBallText, { color: palette.textStrong }]}>{v !== null && v !== void 0 ? v : '--'}</react_native_1.Text>
                          </react_native_1.View>);
                                        })}
                    </react_native_1.View>
                    <react_native_1.Text style={[styles.selectionHint, { color: palette.textSoft }]}>
                      Selected {selectedNumbers.length} of {requiredCount} {requiredCount === 1 ? itemLabel : itemLabel + 's'}
                    </react_native_1.Text>
                  </>)}
              </>);
                            })()}

          {selectedGame && (function () {
                                var gameType = getGameType(selectedGame.id);
                                var is2D = gameType === '2number';
                                if (is2D) {
                                    // 2D special interface: Row and Column
                                    return (<react_native_1.View>
                  <react_native_1.View>
                    <react_native_1.Text style={[styles.sectionLabel, { color: palette.textSoft }]}>First Digit (Tens)</react_native_1.Text>
                    <react_native_1.View style={[styles.numberGrid, { marginTop: 8 }]}>
                      {Array.from({ length: 10 }, function (_, i) { return i; }).map(function (v) {
                                            var chosen = selectedNumbers[0] === v;
                                            return (<react_native_1.Pressable key={"digit1-".concat(v)} onPress={function () {
                                                    if (betMode === 'manual') {
                                                        setSelectedNumbers(function (cur) { var _a; return [v, (_a = cur[1]) !== null && _a !== void 0 ? _a : null].filter(function (n) { return n !== null; }); });
                                                    }
                                                }} disabled={betMode !== 'manual'} style={[styles.numberChip, {
                                                        backgroundColor: chosen ? palette.numberSelected : palette.numberIdle,
                                                        opacity: betMode === 'manual' ? 1 : 0.45,
                                                        width: '18%',
                                                        height: 44,
                                                    }]}>
                            <react_native_1.Text style={[styles.numberChipText, { color: chosen ? palette.numberSelectedText : palette.numberIdleText }]}>
                              {v}
                            </react_native_1.Text>
                          </react_native_1.Pressable>);
                                        })}
                    </react_native_1.View>
                  </react_native_1.View>

                  <react_native_1.View style={{ marginTop: 16 }}>
                    <react_native_1.Text style={[styles.sectionLabel, { color: palette.textSoft }]}>Second Digit (Units)</react_native_1.Text>
                    <react_native_1.View style={[styles.numberGrid, { marginTop: 8 }]}>
                      {Array.from({ length: 10 }, function (_, i) { return i; }).map(function (v) {
                                            var chosen = selectedNumbers[1] === v;
                                            return (<react_native_1.Pressable key={"digit2-".concat(v)} onPress={function () {
                                                    if (betMode === 'manual') {
                                                        setSelectedNumbers(function (cur) { var _a; return [(_a = cur[0]) !== null && _a !== void 0 ? _a : null, v].filter(function (n) { return n !== null; }); });
                                                    }
                                                }} disabled={betMode !== 'manual'} style={[styles.numberChip, {
                                                        backgroundColor: chosen ? palette.numberSelected : palette.numberIdle,
                                                        opacity: betMode === 'manual' ? 1 : 0.45,
                                                        width: '18%',
                                                        height: 44,
                                                    }]}>
                            <react_native_1.Text style={[styles.numberChipText, { color: chosen ? palette.numberSelectedText : palette.numberIdleText }]}>
                              {v}
                            </react_native_1.Text>
                          </react_native_1.Pressable>);
                                        })}
                    </react_native_1.View>
                  </react_native_1.View>
                </react_native_1.View>);
                                }
                                // For other games: standard grid
                                var isDigit = isDigitGame(gameType);
                                var allowsDuplicates = gameType !== '6number';
                                var digitCount = allowsDuplicates ? selectedNumbers.reduce(function (acc, n) {
                                    acc[n] = (acc[n] || 0) + 1;
                                    return acc;
                                }, {}) : {};
                                return (<react_native_1.View style={styles.numberGrid}>
                {numberOptions.map(function (v) {
                                        var count = allowsDuplicates ? (digitCount[v] || 0) : 0;
                                        var chosen = allowsDuplicates ? count > 0 : selectedBallSet.has(v);
                                        var chipWidth = isDigit ? '18%' : 36;
                                        var chipHeight = isDigit ? 40 : 36;
                                        return (<react_native_1.Pressable key={"num-".concat(v)} onPress={function () { return toggleManualNumber(v); }} disabled={betMode !== 'manual'} style={[styles.numberChip, {
                                                    backgroundColor: chosen ? palette.numberSelected : palette.numberIdle,
                                                    opacity: betMode === 'manual' ? 1 : 0.45,
                                                    width: chipWidth,
                                                    height: chipHeight,
                                                    position: 'relative',
                                                }]}>
                      <react_native_1.Text style={[styles.numberChipText, { color: chosen ? palette.numberSelectedText : palette.numberIdleText }]}>
                        {v}
                      </react_native_1.Text>
                      {allowsDuplicates && count > 1 && (<react_native_1.View style={[styles.countBadge, { backgroundColor: palette.accent }]}>
                          <react_native_1.Text style={[styles.countBadgeText, { color: palette.accentText }]}>{count}</react_native_1.Text>
                        </react_native_1.View>)}
                    </react_native_1.Pressable>);
                                    })}
              </react_native_1.View>);
                            })()}
          

          <react_native_1.View style={styles.stakeRow}>
            <react_native_1.Text style={[styles.stakeLabel, { color: palette.textSoft }]}>Stake per line</react_native_1.Text>
            <react_native_1.View style={styles.stakeControlRow}>
              <react_native_1.Pressable style={[styles.stakeButton, { backgroundColor: palette.chipIdle }]} onPress={function () { return changeStake(-20); }}>
                <react_native_1.Text style={[styles.stakeButtonText, { color: palette.chipIdleText }]}>-20</react_native_1.Text>
              </react_native_1.Pressable>
              <react_native_1.Text style={[styles.stakeValue, { color: palette.textStrong }]}>{formatCurrency(stake)}</react_native_1.Text>
              <react_native_1.Pressable style={[styles.stakeButton, { backgroundColor: palette.chipIdle }]} onPress={function () { return changeStake(20); }}>
                <react_native_1.Text style={[styles.stakeButtonText, { color: palette.chipIdleText }]}>+20</react_native_1.Text>
              </react_native_1.Pressable>
            </react_native_1.View>
          </react_native_1.View>

          <react_native_1.Pressable style={[styles.placeBetButton, { backgroundColor: palette.accent, opacity: placingBet ? 0.7 : 1 }]} onPress={placeBet} disabled={placingBet}>
            <vector_icons_1.Ionicons name="ticket-outline" size={16} color={palette.accentText}/>
            <react_native_1.Text style={[styles.placeBetText, { color: palette.accentText }]}>
              {placingBet ? 'Placing Bet…' : 'Place Bet for 9:00 PM Draw'}
            </react_native_1.Text>
          </react_native_1.Pressable>

          <react_native_1.Text style={[styles.noticeText, { color: palette.warning }]}>{notice}</react_native_1.Text>
        </react_native_1.Animated.View>

        {/* Latest Official Numbers */}
        {selectedGame && (<react_native_1.View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
            <react_native_1.Text style={[styles.sectionTitle, { color: palette.textStrong }]}>Latest Official 9:00 PM Result</react_native_1.Text>
            <react_native_1.Text style={[styles.resultMeta, { color: palette.textSoft }]}>{selectedGame.name} - {latestSettledDrawKey}</react_native_1.Text>
            <react_native_1.View style={[styles.officialRow, { backgroundColor: palette.stageBg }]}>
              {latestOfficialNumbers.map(function (v) { return (<react_native_1.View key={"official-".concat(v)} style={[styles.officialBall, { backgroundColor: palette.secondaryButton }]}>
                  <react_native_1.Text style={[styles.officialBallText, { color: palette.secondaryButtonText }]}>{v}</react_native_1.Text>
                </react_native_1.View>); })}
            </react_native_1.View>
            <react_native_1.Text style={[styles.resultMeta, { color: palette.textSoft }]}>Your pending bets auto-settle right after 9:00 PM.</react_native_1.Text>
          </react_native_1.View>)}
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>)];
                case 6:
                    styles = react_native_1.StyleSheet.create({
                        safeArea: { flex: 1 },
                        orbTop: { position: 'absolute', width: 280, height: 280, borderRadius: 140, top: -80, right: -85, opacity: 0.55 },
                        orbBottom: { position: 'absolute', width: 320, height: 320, borderRadius: 160, left: -130, bottom: -130, opacity: 0.42 },
                        scrollContent: { padding: 16, gap: 14 },
                        heroCard: { borderRadius: 18, padding: 16 },
                        heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
                        heroTag: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontFamily: theme_1.Fonts.mono },
                        heroTitle: { marginTop: 4, fontSize: 24, fontWeight: '800', fontFamily: theme_1.Fonts.rounded },
                        heroSubTitle: { marginTop: 5, fontSize: 13, fontWeight: '500', fontFamily: theme_1.Fonts.sans },
                        heroStatsRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
                        heroStat: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
                        heroStatLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: theme_1.Fonts.mono },
                        heroStatValue: { marginTop: 5, fontSize: 20, fontWeight: '800', fontFamily: theme_1.Fonts.rounded },
                        drawMeta: { marginTop: 10, fontSize: 12, fontWeight: '600', fontFamily: theme_1.Fonts.sans },
                        drawSource: { marginTop: 3, fontSize: 12, fontWeight: '500', fontFamily: theme_1.Fonts.sans },
                        demoBadge: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
                        demoBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: theme_1.Fonts.sans },
                        card: { borderRadius: 16, borderWidth: 1, padding: 14 },
                        sectionTitle: { fontSize: 18, fontWeight: '800', fontFamily: theme_1.Fonts.rounded },
                        gameGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
                        gameChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, minWidth: '47%' },
                        gameChipLabel: { fontSize: 13, fontWeight: '700', fontFamily: theme_1.Fonts.sans },
                        gameChipSub: { marginTop: 2, fontSize: 11, fontWeight: '500', fontFamily: theme_1.Fonts.mono },
                        modeRow: { marginTop: 12, flexDirection: 'row', gap: 8 },
                        modeChip: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
                        modeChipText: { fontSize: 13, fontWeight: '700', fontFamily: theme_1.Fonts.sans },
                        luckyButton: { marginTop: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, flexDirection: 'row', gap: 7 },
                        luckyButtonText: { fontSize: 13, fontWeight: '700', fontFamily: theme_1.Fonts.sans },
                        selectionTray: { marginTop: 12, flexDirection: 'row', gap: 8, justifyContent: 'flex-start', flexWrap: 'wrap' },
                        selectionBall: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
                        selectionBallText: { fontSize: 14, fontWeight: '800', fontFamily: theme_1.Fonts.rounded },
                        countBadge: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
                        countBadgeText: { fontSize: 10, fontWeight: '800', fontFamily: theme_1.Fonts.rounded },
                        selectionHint: { marginTop: 8, fontSize: 12, fontWeight: '600', fontFamily: theme_1.Fonts.sans },
                        sectionLabel: { fontSize: 12, fontWeight: '700', fontFamily: theme_1.Fonts.sans, marginBottom: 4 },
                        numberGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
                        numberChip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
                        numberChipText: { fontSize: 12, fontWeight: '700', fontFamily: theme_1.Fonts.mono },
                        stakeRow: { marginTop: 12 },
                        stakeLabel: { fontSize: 12, fontWeight: '700', fontFamily: theme_1.Fonts.sans },
                        stakeControlRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
                        stakeButton: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
                        stakeButtonText: { fontSize: 12, fontWeight: '700', fontFamily: theme_1.Fonts.mono },
                        stakeValue: { fontSize: 18, fontWeight: '800', fontFamily: theme_1.Fonts.rounded },
                        placeBetButton: { marginTop: 12, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
                        placeBetText: { fontSize: 14, fontWeight: '800', fontFamily: theme_1.Fonts.rounded },
                        noticeText: { marginTop: 10, fontSize: 12, lineHeight: 18, fontWeight: '600', fontFamily: theme_1.Fonts.sans },
                        resultMeta: { marginTop: 8, fontSize: 12, fontWeight: '500', fontFamily: theme_1.Fonts.sans },
                        officialRow: { marginTop: 10, borderRadius: 12, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
                        officialBall: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
                        officialBallText: { fontSize: 13, fontWeight: '700', fontFamily: theme_1.Fonts.rounded },
                        // Jackpot carousel
                        jackpotSubtitle: { fontSize: 12, fontWeight: '500', fontFamily: theme_1.Fonts.sans, marginTop: 2 },
                        jackpotCard: { width: 260, borderRadius: 16, padding: 18, marginRight: 12 },
                        jackpotGameName: { fontSize: 13, fontWeight: '700', fontFamily: theme_1.Fonts.mono, textTransform: 'uppercase', letterSpacing: 0.5 },
                        jackpotAmount: { fontSize: 26, fontWeight: '900', fontFamily: theme_1.Fonts.rounded, marginTop: 6 },
                        jackpotLabel: { fontSize: 11, fontWeight: '500', fontFamily: theme_1.Fonts.sans, marginTop: 2 },
                        jackpotStatus: { fontSize: 11, fontWeight: '600', fontFamily: theme_1.Fonts.sans, marginTop: 5 },
                        jackpotBetBtn: { marginTop: 14, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
                        jackpotBetBtnText: { fontSize: 13, fontWeight: '800', fontFamily: theme_1.Fonts.rounded },
                        dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
                        dot: { width: 7, height: 7, borderRadius: 4 },
                        categorySection: { marginTop: 12 },
                        categoryLabel: { fontSize: 12, fontWeight: '700', fontFamily: theme_1.Fonts.mono, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
                    });
                    return [2 /*return*/];
            }
        });
    }); };
}
