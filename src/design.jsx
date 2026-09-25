import React, { useState, useRef, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Layers,
  Grid2X2,
  Store,
  Bird,
  UserRound,
  Wallet,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  LocateFixed,
  Search,
  X,
  ChevronRight,
  Globe2,
  ShieldCheck,
  MousePointer2,
  Box,
  Check,
  Info,
  Compass,
} from "lucide-react";
import {
  coordinates,
  parseSearch,
  statusOf,
  FREE_COUNT,
  birds,
  hash,
} from "./world.js";
import { mountMap } from "./atlas-map.js";
import { AvatarImage, ProfileEditor } from "./profile-editor.jsx";
import { AVATARS } from "./avatars.js";
import {
  STORAGE_KEY,
  EMPTY_DEMO,
  DEFAULT_AVATAR,
  readDemo,
  saveProfile,
  assignDemoLand,
  transferDemoLand,
  placeDemoBird,
  demoOwner,
  landStatus,
} from "./demo-state.js";
import "./design.css";
import "./voxel.css";

function PixelBird({ type = 0 }) {
  const palettes = [
    ["#f4c453", "#c87735", "#fff0b2"],
    ["#8dd8e9", "#4178a1", "#d3fbf0"],
    ["#c3a3f4", "#7c5dae", "#f1dcfa"],
    ["#aace75", "#5c8b58", "#e2efad"],
  ];
  const [a, b, c] = palettes[type % 4];
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={birds[type % 4].name}>
      <ellipse cx="51" cy="86" rx="28" ry="7" fill="#030c18" opacity=".24" />
      <path d="M29 73H40V85H25V79H29ZM62 73H73V85H58V79H62Z" fill="#d8a048" />
      <path d="M24 39H34V29H66V37H76V72H65V79H35V72H24Z" fill={a} />
      <path
        d="M25 48H35V66H28V72H19V59H25ZM70 47H82V62H76V71H66V59H70Z"
        fill={b}
      />
      <path d="M35 53H65V71H57V77H40V71H35Z" fill={c} />
      <path d="M28 25H35V17H44V26H52V13H61V29H68V48H28Z" fill={a} />
      <path d="M34 34H44V44H34ZM55 34H65V44H55Z" fill="#fff9e4" />
      <path d="M39 36H44V43H39ZM55 36H60V43H55Z" fill="#122433" />
      <path d="M44 44H56V51H49V56H44Z" fill="#e8944c" />
      <path d="M31 21H38V28H31ZM54 16H61V26H54Z" fill={b} />
    </svg>
  );
}
function App() {
  const [demo, setDemo] = useState(() => {
    try {
      return readDemo(localStorage.getItem(STORAGE_KEY));
    } catch {
      return EMPTY_DEMO;
    }
  });
  const [feedback, setFeedback] = useState("");
  const nickname = demo.profile?.nickname || "Путешественник";
  const avatar = demo.profile?.avatar || DEFAULT_AVATAR;
  const myLands = demo.lands.filter((l) => l.owner === "player");
  const demoLandIds = useMemo(
    () => new Set(demo.lands.map((l) => l.id)),
    [demo.lands],
  );
  const saveDemo = (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error(
        "Браузер не разрешил сохранение. Освободи место или разреши локальное хранилище.",
      );
    }
    setDemo(next);
  };
  const action = (fn) => {
    try {
      fn();
    } catch (err) {
      setFeedback(err.message);
    }
  };
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(""), 7000);
    return () => clearTimeout(t);
  }, [feedback]);
  useEffect(() => {
    const update = (e) => {
      if (e.key === STORAGE_KEY || e.key === null)
        setDemo(readDemo(e.newValue));
    };
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  const [selected, setSelected] = useState(48216),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [frame, setFrame] = useState({
      scale: 7,
      markers: [],
      center: 48216,
      viewport: { x: 0.3, y: 0.3, w: 0.3, h: 0.3 },
    }),
    [panel, setPanel] = useState(() => window.innerWidth > 760),
    [modal, setModal] = useState(null),
    [nav, setNav] = useState("map"),
    [showLabels, setShowLabels] = useState(true);
  const canvas = useRef(),
    map = useRef(),
    options = useRef();
  options.current = {
    selected,
    filter,
    demoLands: demo.lands,
    statusFor: (id) => (demoLandIds.has(id) ? "owned" : statusOf(id)),
    onFrame: setFrame,
    onSelect: (id) => {
      setSelected(id);
      setPanel(true);
    },
  };
  useEffect(() => {
    map.current = mountMap(canvas.current, options);
    return () => map.current.destroy();
  }, []);
  useEffect(() => {
    map.current?.update();
  }, [selected, filter, demo]);
  const status = landStatus(demo, selected),
    coords = coordinates(selected);
  const owner = demoOwner(demo, selected);
  const land = demo.lands.find((l) => l.id === selected);
  const ownerAvatar =
    owner === "player"
      ? avatar
      : {
          kind: "preset",
          index: owner === "visitor" ? 14 : Math.floor(hash(selected) * 15),
        };
  const ownerName =
    owner === "player"
      ? nickname
      : owner === "visitor"
        ? "Другой демо-владелец"
        : AVATARS[ownerAvatar.index].name;
  const openLand = (id) => {
    setFilter("all");
    setSelected(id);
    setPanel(true);
    setModal(null);
    setNav("map");
    map.current.center(id);
  };
  const claimDemo = () => {
    if (!demo.profile) {
      setModal("profile");
      setFeedback("Создай демо-профиль, затем примерь выбранную землю.");
      return;
    }
    action(() => {
      saveDemo(assignDemoLand(demo, selected));
      setModal(null);
      setFilter("all");
      map.current.center(selected);
      setFeedback(
        "Демо-участок добавлен. Это не покупка NFT — деньги не списывались.",
      );
    });
  };
  const navigate = (id) => {
    setNav(id);
    if (id === "map") {
      setModal(null);
    } else setModal(id);
  };
  const submit = (e) => {
    e.preventDefault();
    try {
      const id = parseSearch(search);
      setSelected(id);
      setPanel(true);
      setError("");
      map.current.center(id);
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <div className="atlas-app">
      <aside className="rail">
        <button
          className="rail-logo"
          aria-label="Rich Birds — карта"
          onClick={() => navigate("map")}
        >
          <PixelBird />
        </button>
        <div className="rail-divider" />
        <nav>
          {[
            ["map", Layers, "Карта"],
            ["market", Store, "Маркет"],
            ["lands", Grid2X2, "Земли"],
            ["birds", Bird, "Птицы"],
            ["profile", UserRound, "Профиль"],
          ].map(([id, Icon, label]) => (
            <button
              className={nav === id ? "active" : ""}
              key={id}
              onClick={() => navigate(id)}
              aria-label={label}
            >
              <Icon size={21} />
              <span>{label}</span>
              {nav === id && <i />}
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <button
            aria-label="О дизайн-концепции"
            onClick={() => setModal("about")}
          >
            <Info size={20} />
          </button>
          <span>RB / 04</span>
        </div>
      </aside>
      <header className="game-header">
        <button className="wordmark" onClick={() => navigate("map")}>
          RICH BIRDS<span>VOXEL WORLD / LAND EXPLORER</span>
        </button>
        <div className="header-divider" />
        <span className="world-count">
          <i />
          <span>
            СВОБОДНЫХ ЗЕМЕЛЬ
            <strong>
              {(
                FREE_COUNT -
                demo.lands.filter((l) => statusOf(l.id) === "free").length
              ).toLocaleString("ru-RU")}{" "}
              <small>/ 100 000 · ДЕМО</small>
            </strong>
          </span>
        </span>
        <button className="my-lands" onClick={() => navigate("lands")}>
          <Box size={16} /> Мои земли{" "}
          {myLands.length > 0 && `(${myLands.length})`}{" "}
          <ArrowUpRight size={14} />
        </button>
        <div className="header-right">
          <span className="design-badge">
            <i /> ДЕМО-ПРОТОТИП
          </span>
          <button className="language" onClick={() => setModal("language")}>
            <Globe2 size={15} /> RU
          </button>
          <button className="connect" onClick={() => setModal("wallet")}>
            <Wallet size={16} />
            <span>Подключить кошелёк</span>
            <ArrowUpRight size={15} />
          </button>
          <button
            className="header-profile"
            aria-label={`Профиль: ${nickname}`}
            title={nickname}
            onClick={() => navigate("profile")}
          >
            <AvatarImage avatar={avatar} name={nickname} />
          </button>
        </div>
      </header>
      <main className={`atlas-main ${panel ? "has-panel" : ""}`}>
        <section
          className="land-map"
          aria-label="Карта 100 000 демонстрационных участков"
        >
          <canvas
            ref={canvas}
            tabIndex={0}
            aria-label="Карта земель. Стрелки — перемещение, плюс и минус — масштаб, Enter — выбрать центральный участок."
          />
          <div className="map-shading" />
          <div className="map-top">
            <div className="world-heading">
              <div className="overline">
                <span /> RICH BIRDS METAVERSE{" "}
                <span className="version">VOXEL WORLD</span>
              </div>
              <h1>GENESIS VALLEY</h1>
              <p>Выбери клетку. Начни свою историю.</p>
            </div>
            <div className="map-toolbar">
              <form className="search-field" onSubmit={submit}>
                <Search size={16} />
                <input
                  aria-label="Поиск участка"
                  placeholder="Номер участка или X, Y"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" aria-label="Найти участок">
                  <ArrowRight size={15} />
                </button>
              </form>
              <button
                className={`layers-button ${!showLabels ? "dim" : ""}`}
                aria-label={
                  showLabels
                    ? "Скрыть маркеры жителей"
                    : "Показать маркеры жителей"
                }
                onClick={() => setShowLabels(!showLabels)}
              >
                <Layers size={17} />
              </button>
            </div>
          </div>
          <div className="map-filters">
            {[
              ["all", "Все земли"],
              ["free", "Свободные"],
              ["owned", "Занятые"],
              ["sale", "Продаются"],
            ].map(([id, label]) => (
              <button
                aria-pressed={filter === id}
                key={id}
                className={filter === id ? "active" : ""}
                onClick={() => setFilter(id)}
              >
                {id !== "all" && <i className={id} />} {label}
              </button>
            ))}
          </div>
          {error && (
            <div className="map-error" role="alert">
              {error}
              <button aria-label="Закрыть ошибку" onClick={() => setError("")}>
                <X size={14} />
              </button>
            </div>
          )}
          {showLabels &&
            frame.markers.map((m) => (
              <button
                key={m.id}
                className={`resident-marker marker-${m.i % 4} ${selected === m.id ? "selected" : ""} ${m.mine ? "my-marker" : ""}`}
                style={{ left: m.x, top: m.y }}
                onClick={() => {
                  setSelected(m.id);
                  setPanel(true);
                }}
                aria-label={`Выбрать участок ${m.id}`}
              >
                <span className="resident-art">
                  <AvatarImage
                    avatar={
                      m.mine
                        ? avatar
                        : { kind: "preset", index: m.visitor ? 14 : m.i }
                    }
                    name={
                      m.mine
                        ? nickname
                        : m.visitor
                          ? "Другой демо-владелец"
                          : AVATARS[m.i].name
                    }
                  />
                  <span className="marker-corner">
                    <Box size={10} />
                  </span>
                </span>
                <span className="resident-name">
                  {m.mine
                    ? nickname
                    : m.visitor
                      ? "Другой демо-владелец"
                      : AVATARS[m.i].name}
                  <span>
                    #{m.id} · {m.mine ? "МОЯ ЗЕМЛЯ · ДЕМО" : "ДЕМО-ВЛАДЕЛЕЦ"}
                  </span>
                </span>
                <i />
              </button>
            ))}
          <div className="region-label region-west">
            <span>SECTOR 04</span> ИЗУМРУДНАЯ РОЩА <i />
          </div>
          <div className="region-label region-east">
            <span>SECTOR 05</span> СОЛНЕЧНЫЕ ЗЕМЛИ <i />
          </div>
          {!panel && (
            <button className="reopen-panel" onClick={() => setPanel(true)}>
              <Box size={16} /> Участок #{selected}
              <ChevronRight size={16} />
            </button>
          )}
          <div className="map-bottom">
            <div className="map-legend">
              <span>
                <i className="free" />
                Свободно
              </span>
              <span>
                <i className="owned" />
                Занято
              </span>
              <span>
                <i className="sale" />
                Продаётся
              </span>
              <span className="legend-divider" />
              <small>Все участки — демо</small>
            </div>
            <div className="navigation-hint">
              <MousePointer2 size={13} /> Перетаскивай карту <span>·</span>{" "}
              Скролл для масштаба
            </div>
          </div>
          <div className="zoom-stack">
            <button
              aria-label="Увеличить карту"
              onClick={() => map.current.zoom(1.35)}
            >
              <Plus size={20} />
            </button>
            <span>{Math.round((frame.scale / 7) * 100)}%</span>
            <button
              aria-label="Уменьшить карту"
              onClick={() => map.current.zoom(1 / 1.35)}
            >
              <Minus size={20} />
            </button>
            <div />
            <button
              aria-label="Сбросить положение карты"
              onClick={() => map.current.reset()}
            >
              <LocateFixed size={19} />
            </button>
          </div>
          <div className="mini-map">
            <div className="mini-map-top">
              <span>
                <Compass size={12} /> ОБЗОР МИРА
              </span>
              <span>N ↑</span>
            </div>
            <div className="mini-map-grid">
              <div
                style={{
                  left: `${Math.min(85, frame.viewport.x * 100)}%`,
                  top: `${Math.min(80, frame.viewport.y * 100)}%`,
                  width: `${Math.min(100, frame.viewport.w * 100)}%`,
                  height: `${Math.min(100, frame.viewport.h * 100)}%`,
                }}
              />
              <i />
              <i />
              <i />
            </div>
            <span className="mini-coords">
              X {coordinates(frame.center || selected).x} <span /> Y{" "}
              {coordinates(frame.center || selected).y}
            </span>
          </div>
        </section>
        {panel && (
          <aside className="parcel-panel">
            <div className="panel-title">
              <span>
                <Box size={17} /> Участок <strong>#{selected}</strong>
              </span>
              <button
                aria-label="Закрыть панель участка"
                onClick={() => setPanel(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="panel-scroll">
              <div className="parcel-art">
                <div className="parcel-art-grid" />
                <div className="island-art">
                  <div className="voxel-tree t1" />
                  <div className="voxel-tree t2" />
                  <div className="little-house">
                    <div className="house-roof" />
                    <div className="house-door" />
                    <div className="house-window" />
                  </div>
                  <div className="island-base" />
                  <div className="island-grass" />
                  <span className="flower f1" />
                  <span className="flower f2" />
                  <span className="art-bird">
                    <PixelBird type={1} />
                  </span>
                </div>
                <span className="art-tag">LAND COLLECTION</span>
                <span className="art-demo">DEMO</span>
                <span className="art-id">#{selected}</span>
              </div>
              <div className="parcel-name-row">
                <h2>Твой уголок мира</h2>
                <span className={`parcel-status ${status}`}>
                  {status === "free"
                    ? "Свободен"
                    : status === "sale"
                      ? "Продаётся"
                      : "Занят"}
                </span>
              </div>
              <p className="parcel-subtitle">
                <LocateFixed size={12} /> Изумрудная роща <span>·</span> X:{" "}
                {coords.x}, Y: {coords.y}
              </p>
              <div className="owner-card">
                <div className="owner-picture">
                  {status === "free" ? (
                    <Box size={23} />
                  ) : (
                    <AvatarImage avatar={ownerAvatar} name={ownerName} />
                  )}
                </div>
                <div>
                  <span>
                    {status === "free"
                      ? "СТАТУС УЧАСТКА"
                      : owner === "player"
                        ? "МОЯ ЗЕМЛЯ · ДЕМО"
                        : "ДЕМО-ВЛАДЕЛЕЦ"}
                  </span>
                  <strong>
                    {status === "free" ? "Ждёт свою историю" : ownerName}
                  </strong>
                </div>
                <span className="owner-link">
                  <ArrowUpRight size={16} />
                </span>
              </div>
              {status === "free" && (
                <button
                  className="demo-claim"
                  onClick={() => setModal("demo-land")}
                >
                  <Plus size={16} /> Примерить участок · демо{" "}
                  <ArrowUpRight size={15} />
                </button>
              )}
              {owner === "player" && (
                <div className="owned-banner">
                  <Check size={14} /> Аватар твоего профиля виден на этой земле
                </div>
              )}
              <div className="price-line">
                <span>
                  {status === "free" ? "Первичная цена" : "Доступ к курятнику"}
                  <small>
                    {status === "free"
                      ? "Планируемые условия"
                      : "Вместе с участком"}
                  </small>
                </span>
                <strong>
                  {status === "free" ? "$1" : "Включён"}
                  <small>
                    {status === "free"
                      ? "Стейблкоин не выбран"
                      : "Не отдельный NFT"}
                  </small>
                </strong>
              </div>
              <button
                className="enter-coop"
                onClick={() => {
                  setModal("coop");
                }}
              >
                <Box size={18} /> Заглянуть в курятник{" "}
                <ArrowUpRight size={17} />
              </button>
              <p className="guest-note">
                <ShieldCheck size={12} />{" "}
                {owner === "player"
                  ? "Управление птицами · демо"
                  : "Гостевой просмотр · без кошелька"}
              </p>
              <div className="panel-section">
                <h3>
                  ОБ УЧАСТКЕ <Info size={13} />
                </h3>
                <dl>
                  <div>
                    <dt>Коллекция</dt>
                    <dd>
                      Rich Birds Land <Box size={12} />
                    </dd>
                  </div>
                  <div>
                    <dt>Номер NFT</dt>
                    <dd>#{selected}</dd>
                  </div>
                  <div>
                    <dt>Координаты</dt>
                    <dd className="cyan">
                      {coords.x}, {coords.y}
                    </dd>
                  </div>
                  <div>
                    <dt>Птицы</dt>
                    <dd>Отдельная коллекция</dd>
                  </div>
                  <div>
                    <dt>Сеть</dt>
                    <dd>
                      Не подключена <i />
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="panel-section inhabitants">
                <h3>
                  БУДУЩИЕ ОБИТАТЕЛИ{" "}
                  <button
                    aria-label="Открыть коллекцию птиц"
                    onClick={() => navigate("birds")}
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </h3>
                <div>
                  {birds.slice(0, 3).map((b, i) => (
                    <button
                      key={b.id}
                      className={`tiny-bird bird-bg-${i}`}
                      onClick={() => setModal("bird-" + i)}
                      aria-label={b.name}
                    >
                      <PixelBird type={i} />
                      <span>DEMO</span>
                    </button>
                  ))}
                </div>
                <p>Земля — твоя. Птицы — всегда в твоём кошельке.</p>
              </div>
              <button
                className="purchase-details"
                onClick={() => setModal("terms")}
              >
                Состав и условия покупки <ArrowRight size={15} />
              </button>
              <div className="design-note">
                <span />
                <p>
                  Интерактивный прототип.
                  <br />
                  Реальные NFT и сделки не подключены.
                </p>
              </div>
            </div>
          </aside>
        )}
      </main>
      <footer className="game-footer">
        <span>
          <i /> МИР ОТКРЫТ ДЛЯ ИССЛЕДОВАНИЯ
        </span>
        <span>
          100 000 УЧАСТКОВ <b>·</b> ОДИН БОЛЬШОЙ МИР
        </span>
        <button onClick={() => setModal("about")}>
          О проекте <ArrowUpRight size={11} />
        </button>
      </footer>
      {feedback && (
        <div className="demo-feedback" role="status">
          {feedback}
          <button
            aria-label="Закрыть уведомление"
            onClick={() => setFeedback("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          close={() => {
            setModal(null);
            setNav("map");
          }}
        >
          {modal === "demo-land" ? (
            <>
              <span className="modal-eyebrow">
                ДЕМОНСТРАЦИЯ ВЛАДЕНИЯ · НЕ ПОКУПКА
              </span>
              <h2>Примерь участок #{selected}</h2>
              <p>
                На этой земле появятся твой ник и выбранный аватар. Так будет
                выглядеть участок после покупки в будущем Web3-релизе.
              </p>
              <div className="modal-notice">
                <ShieldCheck size={22} /> Сейчас изменятся только демо-данные
                этого браузера. NFT не создаётся, деньги не списываются, подпись
                кошелька не запрашивается.
              </div>
              <button className="modal-primary" onClick={claimDemo}>
                {demo.profile
                  ? "Добавить в мои демо-земли"
                  : "Сначала создать демо-профиль"}
                <ArrowRight size={16} />
              </button>
            </>
          ) : modal === "transfer-demo" ? (
            <>
              <span className="modal-eyebrow">
                ПРОВЕРКА СМЕНЫ ВЛАДЕЛЬЦА · ДЕМО
              </span>
              <h2>Передать землю другому герою?</h2>
              <p>
                Твой аватар сменится на аватар нового демо-владельца. Управление
                этим курятником станет недоступно. Размещённые птицы исчезнут из
                сцены, но останутся в твоём демо-инвентаре.
              </p>
              <div className="modal-notice">
                Это локальный тест поведения, не блокчейн-транзакция.
              </div>
              <button
                className="modal-primary"
                onClick={() =>
                  action(() => {
                    saveDemo(transferDemoLand(demo, selected, "visitor"));
                    setModal(null);
                    setFeedback(
                      "Демо-владелец изменён. Твои птицы сохранены в инвентаре.",
                    );
                  })
                }
              >
                Подтвердить демо-передачу <ArrowRight size={16} />
              </button>
            </>
          ) : modal === "wallet" ? (
            <>
              <span className="modal-eyebrow">
                ДИЗАЙН, КОТОРЫЙ МОЖНО ИССЛЕДОВАТЬ
              </span>
              <h2>Кошелёк — на следующем этапе</h2>
              <p>
                Дизайн утверждён, интерактивный прототип развивается. Вход по
                подписи, контракты и реальные сделки ещё не подключены.
              </p>
              <div className="modal-notice">
                <ShieldCheck size={21} /> Здесь не запрашиваются подписи и не
                списываются средства. Все земли и птицы — демонстрационные.
              </div>
              <button className="modal-primary" onClick={() => setModal(null)}>
                Вернуться в мир <ArrowRight size={16} />
              </button>
            </>
          ) : modal === "lands" ? (
            <>
              <span className="modal-eyebrow">ТВОЁ МЕСТО В МЕТАВСЕЛЕННОЙ</span>
              <h2>Мои земли</h2>
              {myLands.length ? (
                <>
                  <p className="editor-intro">
                    Демо-земли этого браузера. Не активы кошелька.
                  </p>
                  <div className="my-land-list">
                    {myLands.map((l) => (
                      <button key={l.id} onClick={() => openLand(l.id)}>
                        <AvatarImage avatar={avatar} name="" />
                        <span>
                          <strong>Участок #{l.id}</strong>
                          <small>
                            X {coordinates(l.id).x} · Y {coordinates(l.id).y} ·{" "}
                            {nickname}
                          </small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-land">
                  <Grid2X2 size={46} />
                  <p>
                    Пока нет твоих демо-земель.
                    <br />
                    Демонстрационные участки не являются твоими NFT.
                  </p>
                </div>
              )}
              <button
                className="modal-primary"
                onClick={() => {
                  const freeId = Array.from(
                    { length: 100000 },
                    (_, i) => ((48216 + i) % 100000) + 1,
                  ).find((id) => landStatus(demo, id) === "free");
                  if (!freeId) {
                    setFeedback("В демо-мире не осталось свободных участков.");
                    return;
                  }
                  openLand(freeId);
                  setFeedback(
                    "Выбран свободный участок. Нажми «Примерить участок · демо».",
                  );
                }}
              >
                Найти свободную землю <ArrowRight size={16} />
              </button>
            </>
          ) : modal === "profile" ? (
            <ProfileEditor
              profile={demo.profile}
              onSave={(profile) => {
                saveDemo(saveProfile(demo, profile));
                setModal(null);
                setNav("map");
                setFeedback(
                  "Профиль сохранён. Аватар обновлён на всех твоих демо-землях.",
                );
              }}
            />
          ) : modal === "coop" ? (
            <>
              <span className="modal-eyebrow">
                КУРЯТНИК #{selected} ·{" "}
                {owner === "player" ? "ДЕМО-ВЛАДЕЛЕЦ" : "ГОСТЕВОЙ ПРОСМОТР"}
              </span>
              <h2>Маленький дом. Большая история.</h2>
              <div className="coop-sketch">
                <div className="coop-window" />
                <div className="coop-beam" />
                <div className="coop-floor" />
                <div className="coop-perch" />
                {(land
                  ? birds
                      .map((b, i) =>
                        land.placements.includes(b.id) ? i : null,
                      )
                      .filter((i) => i !== null)
                  : [0, 1, 2]
                ).map((i) => (
                  <div className={`coop-bird cb${i}`} key={i}>
                    <PixelBird type={i} />
                  </div>
                ))}
                <span className="coop-caption">
                  {owner === "player"
                    ? "МОЙ ДЕМО-КУРЯТНИК"
                    : "ГОСТЕВОЙ ПРОСМОТР · ДЕМО"}
                </span>
              </div>
              <p>
                Курятник входит в доступ к земле, не продаётся отдельно и не
                имеет улучшений. Птицы показаны как демонстрация стиля.
              </p>
              {owner === "player" && (
                <>
                  <div className="placement-title">
                    <h3>МОИ ДЕМО-ПТИЦЫ</h3>
                    <span>Удаление из сцены не удаляет птицу из инвентаря</span>
                  </div>
                  <div className="demo-bird-placement">
                    {birds.map((b, i) => (
                      <button
                        key={b.id}
                        aria-pressed={land.placements.includes(b.id)}
                        onClick={() =>
                          action(() =>
                            saveDemo(placeDemoBird(demo, selected, b.id)),
                          )
                        }
                      >
                        <PixelBird type={i} />
                        <strong>{b.name}</strong>
                        <small>
                          {land.placements.includes(b.id)
                            ? "Убрать в инвентарь"
                            : "Разместить"}
                        </small>
                        {land.placements.includes(b.id) ? (
                          <Check size={14} />
                        ) : (
                          <Plus size={14} />
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    className="transfer-test"
                    onClick={() => setModal("transfer-demo")}
                  >
                    Проверить смену владельца · демо <ArrowRight size={14} />
                  </button>
                </>
              )}
              {owner === "visitor" && (
                <div className="modal-notice">
                  <ShieldCheck size={20} /> Земля передана другому
                  демо-владельцу. У тебя больше нет управления этим курятником;
                  твои птицы остаются в разделе «Птицы».
                </div>
              )}
            </>
          ) : modal === "terms" ? (
            <>
              <span className="modal-eyebrow">ПРОЗРАЧНО ДО ПОКУПКИ</span>
              <h2>Участок #{selected}</h2>
              <div className="terms">
                {[
                  ["NFT земли", `tokenId ${selected}`],
                  ["Состав", "Земля + доступ к курятнику"],
                  ["Птицы", "Не входят в покупку"],
                  [
                    "Цена",
                    status === "free"
                      ? "План: эквивалент $1"
                      : "Демо-цена не назначена",
                  ],
                  ["Комиссия Rich Birds", "5% через наш маркетплейс"],
                  ["Стейблкоин и газ", "Не определены"],
                ].map(([a, b]) => (
                  <div key={a}>
                    <span>{a}</span>
                    <strong>{b}</strong>
                  </div>
                ))}
              </div>
              <div className="modal-notice">
                Это дизайн экрана, не предложение NFT. Продажи и подключение
                сетей будут реализованы после согласования стейблкоина и условий
                комиссии.
              </div>
              <button className="modal-primary" disabled>
                Покупка пока недоступна
              </button>
            </>
          ) : modal === "birds" ||
            modal === "market" ||
            modal.startsWith("bird-") ? (
            <>
              <span className="modal-eyebrow">
                {modal === "market"
                  ? "МАРКЕТПЛЕЙС · ВИЗУАЛЬНАЯ КОНЦЕПЦИЯ"
                  : "RICH BIRDS COLLECTION"}
              </span>
              <h2>
                {modal === "market"
                  ? "Найди своего обитателя"
                  : "Маленькие. Но с характером."}
              </h2>
              <p>
                Оригинальные птицы Rich Birds. Демо-дизайны, не выпущенные NFT.
                Покупки пока недоступны.
              </p>
              <div className="collection-grid">
                {birds.map((b, i) => (
                  <button
                    className={`collection-card bird-bg-${i}`}
                    key={b.id}
                    onClick={() => setModal("bird-" + i)}
                  >
                    <span className="collection-demo">DEMO / #{b.id}</span>
                    <PixelBird type={i} />
                    <strong>{b.name}</strong>
                    <small>{b.kind}</small>
                    {modal === "bird-" + i && (
                      <span className="bird-selected">
                        <Check size={13} /> Выбрана для просмотра
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : modal === "language" ? (
            <>
              <span className="modal-eyebrow">ЯЗЫК ПРОЕКТА</span>
              <h2>Говорим по-русски</h2>
              <p>
                Прототип подготовлен на русском языке. Другие локализации не
                подключены.
              </p>
            </>
          ) : (
            <>
              <span className="modal-eyebrow">RICH BIRDS / VOXEL WORLD 04</span>
              <h2>Твоя земля. Твой маленький мир.</h2>
              <p>
                Новое направление: тёмный игровой интерфейс, изумрудная сетка
                земель, бирюзовые акценты и солнечно-жёлтые основные действия.
              </p>
              <div className="modal-notice">
                <Info size={20} /> Утверждённый дизайн внедрён в интерактивный
                прототип. Профиль, демо-земли и размещения сохраняются в этом
                браузере. Это не Web3 MVP: сети, контракты и транзакции ещё не
                подключены.
              </div>
              <p>
                Колёсико и кнопки + / − меняют масштаб. Перетаскивание
                перемещает карту. С клавиатуры: стрелки, + / − и Enter для
                выбора участка в центре.
              </p>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
function Dialog({ children, close }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const root = ref.current;
    const get = () => [...root.querySelectorAll("button:not(:disabled),input")];
    get()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const f = get();
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
          e.preventDefault();
          f[0]?.focus();
        }
      }
    };
    root.addEventListener("keydown", key);
    return () => {
      root.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className="game-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Rich Birds — предпросмотр"
      >
        <button
          className="dialog-close"
          aria-label="Закрыть окно"
          onClick={close}
        >
          <X size={20} />
        </button>
        {children}
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
