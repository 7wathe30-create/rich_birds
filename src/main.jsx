import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Map,
  Grid2X2,
  Bird,
  Store,
  ArrowUpRight,
  ArrowRight,
  Wallet,
  Search,
  Plus,
  Minus,
  LocateFixed,
  Sun,
  Moon,
  X,
  Check,
  ChevronDown,
  Compass,
  Leaf,
  ShieldCheck,
  ExternalLink,
  MousePointer2,
  Menu,
  Home,
  Info,
  RotateCcw,
  Camera,
  Upload,
  Sparkles,
} from "lucide-react";
import { WorldScene, BirdArt } from "./scene.jsx";
import {
  coordinates,
  parseSearch,
  statusOf,
  FREE_COUNT,
  birds,
} from "./world.js";
import "./style.css";

const navItems = [
  ["map", Map, "Карта мира"],
  ["lands", Grid2X2, "Мои земли"],
  ["birds", Bird, "Мои птицы"],
  ["market", Store, "Маркетплейс"],
];
function App() {
  const [page, setPage] = useState("map"),
    [isMobile, setIsMobile] = useState(
      () => window.matchMedia("(max-width: 760px)").matches,
    ),
    [selected, setSelected] = useState(null),
    [focus, setFocus] = useState(12415),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [evening, setEvening] = useState(false),
    [zoom, setZoom] = useState(1),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false),
    [coop, setCoop] = useState(false),
    [view, setView] = useState(0),
    [demoOwner, setDemoOwner] = useState(false),
    [placedBirds, setPlacedBirds] = useState(birds.map((b) => b.id)),
    [avatar, setAvatar] = useState(0),
    [nickname, setNickname] = useState("Путешественник"),
    [upload, setUpload] = useState(null),
    [market, setMarket] = useState("birds");
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        setSelected(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const navigate = (p) => {
    setPage(p);
    setCoop(false);
    setMobile(false);
    setSelected(null);
  };
  const goSearch = (e) => {
    e.preventDefault();
    try {
      const id = parseSearch(search);
      setFocus(id);
      setSelected(id);
      setError("");
      setZoom(1.45);
      setCoop(false);
    } catch (err) {
      setError(err.message);
    }
  };
  const select = (id) => {
    setSelected(id);
    setError("");
  };
  const enter = () => {
    setCoop(true);
    setView(0);
    setZoom(1);
    setDemoOwner(false);
  };
  const s = selected ? statusOf(selected) : null;
  return (
    <div className="app">
      {isMobile && mobile && (
        <button
          className="mobile-nav-backdrop"
          tabIndex={-1}
          aria-label="Закрыть меню"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`sidebar ${mobile ? "open" : ""}`}
        inert={isMobile && !mobile}
      >
        {isMobile && (
          <button
            className="mobile-nav-close icon-button"
            aria-label="Закрыть навигацию"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        )}
        <button
          className="brand"
          onClick={() => navigate("map")}
          aria-label="Rich Birds — главная"
        >
          <span className="brand-mark">
            <Bird size={30} strokeWidth={2.7} />
          </span>
          <span>
            rich birds<span className="brand-dot">✦</span>
            <small>МАЛЕНЬКИЙ МИР. БОЛЬШАЯ ИСТОРИЯ.</small>
          </span>
        </button>
        <div className="sidebar-label">ТВОЁ ПРИКЛЮЧЕНИЕ</div>
        <nav>
          {navItems.map(([id, Icon, label]) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {id === "map" ? (
                <span className="nav-dot" />
              ) : id === "market" ? (
                <ArrowUpRight size={15} />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="mini-island">
            <Bird size={29} />
            <Leaf size={17} />
          </div>
          <h3>
            Здесь начинается
            <br />
            твоя история
          </h3>
          <p>
            Найди свой уголок мира.
            <br />А птицы добавят ему жизни.
          </p>
          <button
            onClick={() => {
              navigate("map");
              setFocus(12415);
              setZoom(1);
              setSelected(12415);
            }}
          >
            Найти участок <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setModal("guide")}>
            <Compass size={18} /> Путеводитель <ArrowUpRight size={14} />
          </button>
          <button className="profile" onClick={() => setModal("profile")}>
            <span className="profile-avatar">
              {upload ? (
                <img src={upload} alt="Твой аватар" />
              ) : (
                <Avatar index={avatar} />
              )}
            </span>
            <span>
              {nickname}
              <small>Гость архипелага</small>
            </span>
            <ChevronDown size={15} />
          </button>
          <span
            className="network"
            title="Целевая тестовая сеть. Подключение отсутствует."
          >
            <i /> Robinhood Chain <span>ПЛАН</span>
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Меню"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={23} />
          </button>
          <div className="breadcrumb">
            Архипелаг <span>/</span>{" "}
            <strong>
              {coop ? "Курятник" : navItems.find((n) => n[0] === page)?.[2]}
            </strong>
          </div>
          <div className="header-actions">
            <span className="demo-tag">
              <span /> Дизайн-прототип
            </span>
            <button
              className="wallet-button"
              onClick={() => setModal("wallet")}
            >
              <Wallet size={17} /> Подключить кошелёк <ArrowUpRight size={16} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> СВОЙ ОСТРОВ. СВОЯ ИСТОРИЯ.
              </div>
              <h1>
                {coop
                  ? "Дом, где живут чудеса"
                  : page === "map"
                    ? "Большой мир для маленьких птиц"
                    : page === "lands"
                      ? "Место, которое станет твоим"
                      : page === "birds"
                        ? "У каждой птицы — свой характер"
                        : "Встречай будущих любимцев"}
              </h1>
              <p>
                {coop
                  ? "Дерево, тёплый свет и немного птичьей суеты. Добро пожаловать внутрь."
                  : page === "map"
                    ? "Исследуй архипелаг, найди свою землю и наполни её жизнью."
                    : page === "lands"
                      ? "Все твои участки и их обитатели — в одном месте."
                      : page === "birds"
                        ? "Собирай истории, а не просто коллекцию."
                        : "Земля и птицы — отдельные коллекции. Выбирай то, что ближе тебе."}
              </p>
            </div>
            <button
              className="text-link heading-link"
              onClick={() => setModal("guide")}
            >
              Как устроен этот мир <ArrowUpRight size={17} />
            </button>
          </div>
          {page === "map" ? (
            <>
              <div className="map-toolbar">
                <div className="tabs">
                  {[
                    ["all", "Все земли"],
                    ["free", "Свободные"],
                    ["owned", "Занятые"],
                    ["sale", "Продаются"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={filter === id ? "selected" : ""}
                      onClick={() => {
                        setFilter(id);
                        setCoop(false);
                      }}
                    >
                      {id === "all" && <Grid2X2 size={15} />} {label}
                    </button>
                  ))}
                </div>
                <form className="map-search" onSubmit={goSearch}>
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="№ участка или X, Y"
                    aria-label="Поиск участка по номеру или координатам"
                  />
                  <kbd>↵</kbd>
                </form>
              </div>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <section
                className={`world-map ${evening ? "evening" : ""}`}
                aria-label={
                  coop ? "Трёхмерный курятник" : "Интерактивная карта земель"
                }
              >
                <WorldScene
                  selected={selected}
                  focus={focus}
                  filter={filter}
                  evening={evening}
                  zoom={zoom}
                  onSelect={select}
                  onNavigateFocus={setFocus}
                  coop={coop}
                  view={view}
                  placedBirds={placedBirds}
                />
                <div className="map-top-left">
                  {coop ? (
                    <button className="map-pill" onClick={() => setCoop(false)}>
                      <ArrowRight
                        size={16}
                        style={{ transform: "rotate(180deg)" }}
                      />{" "}
                      На карту
                    </button>
                  ) : (
                    <>
                      <span className="map-pill">
                        <span className="green-dot" /> Лиственный архипелаг{" "}
                        <ChevronDown size={14} />
                      </span>
                      <span className="map-demo">
                        ДЕМО-МИР · НЕ РЕАЛЬНЫЕ АКТИВЫ
                      </span>
                    </>
                  )}
                </div>
                <button
                  className="day-switch"
                  onClick={() => setEvening(!evening)}
                  aria-label={
                    evening ? "Включить дневной свет" : "Включить вечерний свет"
                  }
                >
                  <span className={!evening ? "on" : ""}>
                    <Sun size={17} />
                  </span>
                  <span className={evening ? "on" : ""}>
                    <Moon size={16} />
                  </span>
                </button>
                {!coop && !selected && (
                  <>
                    <div className="world-label label-one">
                      <span>01</span> Шепчущая роща
                    </div>
                    <div className="world-label label-two">
                      <span>02</span> Солнечные поляны <i />
                    </div>
                    <div className="map-welcome">
                      <span className="tiny-label">
                        ТВОЁ МЕСТО УЖЕ ГДЕ-ТО ЗДЕСЬ
                      </span>
                      <h2>
                        Большие истории
                        <br />
                        начинаются с участка.
                      </h2>
                      <button
                        onClick={() => {
                          setSelected(12415);
                          setFocus(12415);
                        }}
                      >
                        Найти свой <ArrowUpRight size={17} />
                      </button>
                    </div>
                  </>
                )}
                {coop && (
                  <div className="coop-caption">
                    <span className="map-pill">
                      <Bird size={16} /> Демонстрационный курятник
                    </span>
                    <h2>Добро пожаловать домой</h2>
                    <p>
                      {demoOwner
                        ? "Демо-владелец · изменения только в прототипе"
                        : "Гостевой просмотр · птицы не являются NFT"}
                    </p>
                    <div className="camera-buttons">
                      {["Общий вид", "Знакомство", "Тихий уголок"].map(
                        (label, i) => (
                          <button
                            className={view === i ? "active" : ""}
                            key={label}
                            onClick={() => setView(i)}
                          >
                            <Camera size={14} />
                            {label}
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      className="demo-owner-toggle"
                      onClick={() => setDemoOwner(!demoOwner)}
                    >
                      {demoOwner
                        ? "Вернуться в гостевой режим"
                        : "Попробовать управление · демо"}{" "}
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
                {selected && !coop && (
                  <div className="plot-card">
                    <div className="plot-card-top">
                      <span className={`status ${s}`}>
                        {s === "free"
                          ? "Свободный участок"
                          : s === "sale"
                            ? "Выставлен на продажу"
                            : "Занятый участок"}
                      </span>
                      <button
                        className="icon-button"
                        onClick={() => setSelected(null)}
                        aria-label="Закрыть участок"
                      >
                        <X size={17} />
                      </button>
                    </div>
                    <h2>Маленький уголок №{selected}</h2>
                    <p className="plot-coords">
                      X: {coordinates(selected).x} <span>·</span> Y:{" "}
                      {coordinates(selected).y} <span>·</span> Демо
                    </p>
                    {s !== "free" && (
                      <div className="owner-row">
                        <span className="owner-avatar">
                          <Bird size={20} />
                        </span>
                        <div>
                          <small>Демонстрационный владелец</small>
                          <strong>
                            {s === "sale"
                              ? "Moss & Feathers"
                              : "Лесной странник"}
                          </strong>
                        </div>
                      </div>
                    )}
                    <div className="plot-price">
                      <span>
                        {s === "free"
                          ? "План первичной продажи"
                          : "Доступ к курятнику"}
                      </span>
                      <strong>{s === "free" ? "$1" : "Включён"}</strong>
                    </div>
                    <p className="plot-disclaimer">
                      Земля — NFT. Курятник входит в доступ к участку, птицы
                      приобретаются отдельно.
                    </p>
                    <button
                      className="primary"
                      onClick={() => setModal("purchase")}
                    >
                      {s === "owned" ? "Об участке" : "Условия покупки"}
                      <ArrowUpRight size={16} />
                    </button>
                    <button className="secondary" onClick={enter}>
                      Заглянуть в курятник <ArrowRight size={16} />
                    </button>
                  </div>
                )}
                <div className="map-bottom-left">
                  <span className="map-pill legend">
                    <i /> Свободно <i /> Занято <i /> Продаётся
                  </span>
                  <span className="map-hint">
                    <MousePointer2 size={13} />{" "}
                    {coop
                      ? "Выбирай ракурс и знакомься с птицами"
                      : "Перетаскивай карту · выбирай участок"}
                  </span>
                </div>
                <div className="map-controls">
                  <button
                    aria-label="Приблизить карту"
                    onClick={() => setZoom((z) => Math.min(2.8, z + 0.3))}
                  >
                    <Plus size={19} />
                  </button>
                  <button
                    aria-label="Отдалить карту"
                    onClick={() => setZoom((z) => Math.max(0.65, z - 0.3))}
                  >
                    <Minus size={19} />
                  </button>
                  <span />
                  <button
                    aria-label="Вернуться к центру карты"
                    onClick={() => {
                      setFocus(12415);
                      setZoom(1);
                      setSelected(null);
                    }}
                  >
                    <LocateFixed size={19} />
                  </button>
                </div>
                <div className="map-compass">
                  N<Compass size={30} strokeWidth={1} />
                </div>
              </section>
              {coop && demoOwner && (
                <section className="placement-panel">
                  <div>
                    <h3>Обитатели курятника</h3>
                    <p>
                      Демонстрация размещения, не операция с NFT. Удалённая
                      птица остаётся в демо-инвентаре.
                    </p>
                  </div>
                  <div className="placement-birds">
                    {birds.map((b) => (
                      <button
                        key={b.id}
                        aria-pressed={placedBirds.includes(b.id)}
                        onClick={() =>
                          setPlacedBirds((current) =>
                            current.includes(b.id)
                              ? current.filter((id) => id !== b.id)
                              : [...current, b.id],
                          )
                        }
                      >
                        <span style={{ background: b.background }}>
                          <BirdArt bird={b} />
                        </span>
                        <strong>{b.name}</strong>
                        <small>
                          {placedBirds.includes(b.id)
                            ? "Убрать в инвентарь"
                            : "Разместить в курятнике"}
                        </small>
                        {placedBirds.includes(b.id) ? (
                          <Check size={16} />
                        ) : (
                          <Plus size={16} />
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="world-stats">
                <div>
                  <span className="stat-icon">
                    <Grid2X2 size={19} />
                  </span>
                  <strong>100 000</strong>
                  <span>уникальных участков</span>
                </div>
                <div>
                  <span className="green-dot" />
                  <strong>{FREE_COUNT.toLocaleString("ru-RU")}</strong>
                  <span>свободно в демо-мире</span>
                </div>
                <div className="stat-last">
                  <ShieldCheck size={18} />
                  <span>Твоя земля. Твои птицы. Твой кошелёк.</span>
                </div>
              </div>
              <section className="birds-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">ПЕРНАТЫЕ ЖИТЕЛИ</span>
                    <h2>Маленькие. Но с характером.</h2>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => navigate("birds")}
                  >
                    Познакомиться со всеми <ArrowRight size={17} />
                  </button>
                </div>
                <div className="bird-grid">
                  {birds.map((b) => (
                    <BirdCard key={b.id} bird={b} onClick={() => setModal(b)} />
                  ))}
                </div>
              </section>
            </>
          ) : page === "lands" ? (
            <section className="empty-state">
              <div className="empty-art">
                <Grid2X2 size={46} />
                <Leaf size={28} />
              </div>
              <span className="eyebrow">НАЧНИ С МАЛЕНЬКОГО</span>
              <h2>Твоя история ещё впереди</h2>
              <p>
                Подключи кошелёк, чтобы увидеть свою землю.
                <br />А пока можно исследовать демонстрационный архипелаг.
              </p>
              <button className="primary" onClick={() => setModal("wallet")}>
                <Wallet size={17} /> Подключить кошелёк
              </button>
              <button className="text-link" onClick={() => navigate("map")}>
                Отправиться на карту <ArrowRight size={16} />
              </button>
            </section>
          ) : (
            <section className="collection">
              <div className="collection-toolbar">
                <div className="tabs">
                  {page === "market" ? (
                    <>
                      <button
                        className={market === "birds" ? "selected" : ""}
                        onClick={() => setMarket("birds")}
                      >
                        Птицы
                      </button>
                      <button
                        className={market === "lands" ? "selected" : ""}
                        onClick={() => setMarket("lands")}
                      >
                        Земля
                      </button>
                    </>
                  ) : (
                    <span className="collection-title">
                      Знакомство с коллекцией
                    </span>
                  )}
                </div>
                <span className="demo-tag">Демонстрационные NFT</span>
              </div>
              {page === "market" && market === "lands" ? (
                <div className="land-market">
                  <div className="land-illustration">
                    <Home size={70} />
                    <Leaf size={45} />
                  </div>
                  <h2>Найди своё место на карте</h2>
                  <p>
                    Первичная цена — эквивалент $1 в согласованном стейблкоине.
                    <br />
                    Продажи пока не запущены.
                  </p>
                  <button className="primary" onClick={() => navigate("map")}>
                    Исследовать земли <ArrowUpRight size={17} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="collection-notice">
                    <Info size={18} /> Это знакомство с дизайном птиц, а не
                    активы твоего кошелька. Реальные NFT появятся после
                    подключения контрактов.
                  </div>
                  <div className="bird-grid large">
                    {birds.map((b) => (
                      <BirdCard
                        bird={b}
                        key={b.id}
                        onClick={() => setModal(b)}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
          <footer>
            <span>
              rich birds <span>© 2026</span>
            </span>
            <p>Мир для исследования. Без обещаний доходности.</p>
            <button onClick={() => setModal("about")}>
              О прототипе <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          {modal === "wallet" ? (
            <>
              <div className="modal-symbol">
                <Wallet size={29} />
              </div>
              <span className="eyebrow">ТВОЙ КЛЮЧ К АРХИПЕЛАГУ</span>
              <h2>Сначала — честно о кошельке</h2>
              <p>
                Сейчас Rich Birds — интерактивный дизайн-прототип. Мы не
                запрашиваем подпись, не подключаем кошелёк и не отправляем
                транзакции.
              </p>
              <div className="info-box">
                <ShieldCheck size={20} />
                <span>
                  Реальное подключение будет доступно после настройки Robinhood
                  Chain, контрактов и проверки входа по подписи.
                </span>
              </div>
              <button className="primary" onClick={() => setModal(null)}>
                Продолжить исследование <ArrowRight size={17} />
              </button>
              <small className="modal-footnote">
                Никаких списаний. Все участки и птицы в интерфейсе — демо.
              </small>
            </>
          ) : modal === "purchase" ? (
            <>
              <span className="eyebrow">ПРОЗРАЧНО ДО ПОКУПКИ</span>
              <h2>Земля #{selected}</h2>
              <p>Предпросмотр условий, не предложение реального NFT.</p>
              <div className="receipt">
                {[
                  ["NFT земли / tokenId", selected],
                  ["Состав", "Земля + доступ к курятнику"],
                  ["Птицы", "Не входят"],
                  [
                    s === "free" ? "Первичная цена" : "Перепродажа",
                    s === "free"
                      ? "Эквивалент $1"
                      : s === "sale"
                        ? "Цена демо-листинга не задана"
                        : "Участок не продаётся",
                  ],
                  ["Стейблкоин", "Не согласован"],
                  ["Комиссия маркетплейса", "5% со сделки"],
                  ["Газ сети", "Рассчитывается перед сделкой"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <p className="info-box">
                Стейблкоин и порядок учёта комиссии ещё требуют согласования.
                Итоговая сумма неизвестна. Продажа отключена.
              </p>
              <button className="primary" disabled>
                Покупка пока недоступна
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setModal(null);
                  enter();
                }}
              >
                Осмотреть демонстрационный курятник
              </button>
            </>
          ) : modal === "profile" ? (
            <>
              <span className="eyebrow">ПРИЯТНО ПОЗНАКОМИТЬСЯ</span>
              <h2>Твой облик в этом мире</h2>
              <p>Локальный предпросмотр профиля. Не привязан к кошельку.</p>
              <label className="input-label">
                Ник
                <input
                  maxLength={24}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </label>
              <span className="input-label">Выбери своего героя</span>
              <div className="avatars">
                {Array.from({ length: 15 }, (_, i) => (
                  <button
                    key={i}
                    className={avatar === i && !upload ? "chosen" : ""}
                    style={{
                      background: `hsl(${(i * 31 + 20) % 360} 28% 87%)`,
                    }}
                    onClick={() => {
                      setAvatar(i);
                      setUpload(null);
                    }}
                    aria-label={`Аватар ${i + 1}`}
                  >
                    <Avatar index={i} />
                    {avatar === i && !upload && <Check size={12} />}
                  </button>
                ))}
              </div>
              <label className="upload">
                <Upload size={17} /> Загрузить свой аватар
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      setToast("Размер изображения — не более 2 МБ");
                      return;
                    }
                    if (
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        file.type,
                      )
                    ) {
                      setToast("Выбери PNG, JPEG или WebP");
                      return;
                    }
                    const r = new FileReader();
                    r.onload = () => setUpload(r.result);
                    r.readAsDataURL(file);
                  }}
                />
              </label>
              <button
                className="primary"
                onClick={() => {
                  if (!nickname.trim()) {
                    setToast("Добавь ник для профиля");
                    return;
                  }
                  setModal(null);
                  setToast("Облик обновлён в этом предпросмотре");
                }}
              >
                Сохранить облик <Check size={16} />
              </button>
            </>
          ) : modal === "guide" ? (
            <>
              <span className="eyebrow">ПУТЕВОДИТЕЛЬ ПО RICH BIRDS</span>
              <h2>Устройся по-птичьи</h2>
              {[
                [
                  "01",
                  "Исследуй без кошелька",
                  "Выбирай участки на карте или ищи по номеру и координатам. Фильтры выделяют нужные земли.",
                ],
                [
                  "02",
                  "Найди свой уголок",
                  "Один номер участка — один неизменный tokenId. Каждая земля открывает одинаковый по возможностям курятник.",
                ],
                [
                  "03",
                  "Познакомься с обитателями",
                  "Птицы — отдельные NFT твоего кошелька. Размещение не передаёт их владельцу земли.",
                ],
                [
                  "04",
                  "Загляни в гости",
                  "Курятники открыты для просмотра. Управлять птицами сможет только текущий владелец земли.",
                ],
              ].map(([n, t, d]) => (
                <div className="guide-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </div>
              ))}
              <button className="primary" onClick={() => setModal(null)}>
                Вперёд, к приключениям <ArrowRight size={17} />
              </button>
            </>
          ) : modal === "about" ? (
            <>
              <span className="eyebrow">СТАТУС РЕЛИЗА</span>
              <h2>Мир начинается с идеи</h2>
              <p>
                Готов визуальный интерактивный прототип: процедурная воксельная
                карта, 100 000 адресуемых земель, четыре дизайна птиц, 15
                аватаров и гостевой курятник.
              </p>
              <div className="info-box">
                Web3 MVP ещё не подключён. На карте нет реальных владельцев,
                продаж или блокчейн-данных. Никакой экономики яиц, кормления и
                доходности.
              </div>
              <p>
                Следующий этап — согласование стейблкоина, реализация и
                тестирование контрактов в тестовой сети. Перед реальными
                средствами потребуется независимая проверка безопасности.
              </p>
            </>
          ) : (
            <>
              <div
                className="bird-detail-art"
                style={{ background: modal.background }}
              >
                <BirdArt bird={modal} />
                <span className="card-demo">DEMO</span>
              </div>
              <span className="eyebrow">ПЕРНАТЫЕ ЖИТЕЛИ · #{modal.id}</span>
              <h2>{modal.name}</h2>
              <p>
                {modal.kind}. Оригинальный воксельный обитатель Rich Birds — со
                своим силуэтом, палитрой и характером движения.
              </p>
              <div className="info-box">
                <Bird size={21} />
                <span>
                  Дизайн коллекции. Не выпущенный NFT, не актив кошелька.
                  Редкость и доходность не назначены.
                </span>
              </div>
              <button
                className="primary"
                onClick={() => {
                  setModal(null);
                  navigate("map");
                  setSelected(12415);
                  setCoop(true);
                }}
              >
                Увидеть в курятнике <ArrowUpRight size={17} />
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
function BirdCard({ bird, onClick }) {
  return (
    <button className="bird-card" onClick={onClick}>
      <div className="bird-art" style={{ background: bird.background }}>
        <BirdArt bird={bird} />
        <span className="card-demo">DEMO</span>
        <span className="bird-number">#{bird.id}</span>
        <span className="bird-open">
          <ArrowUpRight size={17} />
        </span>
      </div>
      <div className="bird-card-body">
        <h3>{bird.name}</h3>
        <p>{bird.kind}</p>
      </div>
    </button>
  );
}
function Avatar({ index }) {
  const colors = ["#db9456", "#6e9b89", "#b18191", "#688baf", "#9b9561"];
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path
        d={
          index % 3 === 0
            ? "M15 26V15H24V8H42V17H49V27Z"
            : index % 3 === 1
              ? "M12 28V10H21V19H43V10H52V29Z"
              : "M14 27V19H23V10H40V19H49V28Z"
        }
        fill={colors[(index + 2) % 5]}
      />
      <path d="M14 26H50V48H43V55H21V48H14Z" fill={colors[index % 5]} />
      <path d="M21 32H28V39H21ZM37 32H44V39H37Z" fill="#fcf7e7" />
      <path d="M24 33H28V38H24ZM37 33H41V38H37Z" fill="#293d34" />
      <path d="M28 40H37V47H28Z" fill="#e9b952" />
      {index > 7 && <path d="M9 26H55V31H9Z" fill="#4b6751" />}
    </svg>
  );
}
function Modal({ children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const prev = document.activeElement;
    const el = ref.current;
    const focusables = () => [
      ...el.querySelectorAll("button:not(:disabled),input,a[href]"),
    ];
    focusables()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
          e.preventDefault();
          f[0]?.focus();
        }
      }
    };
    el.addEventListener("keydown", key);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Информация Rich Birds"
      >
        <button
          className="modal-close icon-button"
          onClick={onClose}
          aria-label="Закрыть окно"
        >
          <X size={22} />
        </button>
        {children}
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
