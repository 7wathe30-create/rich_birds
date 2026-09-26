import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Box,
  Info,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { coordinates, parseSearch, birds } from "./world.js";
import { mountMap, INITIAL_ZOOM } from "./atlas-map.js";
import { AvatarImage, ProfileEditor } from "./profile-editor.jsx";
import { LANDMARKS } from "./landmarks.js";
import { useWallet, WalletPanel } from "./wallet.jsx";
import "./design.css";
import "./voxel.css";
import "./live.css";

export default function App() {
  const wallet = useWallet();
  const [selected, setSelected] = useState(48216),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [modal, setModal] = useState(null),
    [panel, setPanel] = useState(() => innerWidth > 760),
    [frame, setFrame] = useState({ scale: INITIAL_ZOOM, markers: [] }),
    [showAvatars, setShowAvatars] = useState(true),
    [marketTab, setMarketTab] = useState("lands"),
    [access, setAccess] = useState({ allowed: false }),
    [checking, setChecking] = useState(false);
  const canvas = useRef(),
    map = useRef(),
    options = useRef(),
    accessEpoch = useRef(0);
  const lands = wallet.lands || [];
  const landById = useMemo(() => new Map(lands.map((l) => [l.id, l])), [lands]);
  const markers = useMemo(() => {
    const placed = new Map(
      LANDMARKS.map((l) => [l.id, { ...l, illustration: true }]),
    );
    for (const l of lands)
      if (l.avatar || wallet.profile?.avatar)
        placed.set(l.id, {
          id: l.id,
          name: l.nickname || wallet.profile?.nickname || "Владелец",
          avatar: l.avatar || wallet.profile?.avatar,
        });
    return [...placed.values()];
  }, [lands, wallet.profile]);
  options.current = {
    selected,
    filter,
    markers,
    statusFor: (id) => (landById.has(id) ? "owned" : "free"),
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
  }, [selected, filter, markers]);
  useEffect(() => {
    accessEpoch.current++;
    setAccess({ allowed: false });
    setChecking(false);
  }, [selected, wallet.address, wallet.chain?.id, wallet.profile]);
  const coords = coordinates(selected),
    land = landById.get(selected),
    landmark = LANDMARKS.find((l) => l.id === selected),
    nickname = wallet.profile?.nickname || "Профиль";
  const openLand = (id) => {
    setFilter("all");
    setSelected(id);
    setPanel(true);
    setModal(null);
    map.current.center(id);
  };
  const beginConnection = async () => {
    if (wallet.busy) return;
    setModal(null);
    const connected = await wallet.connect();
    if (connected === null) return;
    if (!connected) {
      setModal("wallet");
      return;
    }
    if (connected.restored) return;
    setModal("wallet");
    if (await wallet.signIn(connected.address)) setModal(null);
  };
  const go = (id) => {
    if ((id === "wallet" || id === "profile") && !wallet.authenticated) {
      void beginConnection();
      return;
    }
    setModal(id === "map" ? null : id);
    setError("");
  };
  const submit = (e) => {
    e.preventDefault();
    try {
      openLand(parseSearch(search));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };
  const enterCoop = async () => {
    const epoch = ++accessEpoch.current;
    setChecking(true);
    setError("");
    try {
      const result = await wallet.checkAccess(selected);
      if (epoch !== accessEpoch.current) return;
      setAccess(result);
      if (result.allowed) setModal("coop");
      else
        setError(
          result.reason || "Курятник доступен только владельцу NFT участка.",
        );
    } catch (err) {
      if (epoch === accessEpoch.current) setError(err.message);
    } finally {
      if (epoch === accessEpoch.current) setChecking(false);
    }
  };
  const shortAddress = wallet.address
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
    : null;
  const registrationRequired = wallet.authenticated && !wallet.profile;
  const activeModal = registrationRequired ? "registration" : modal;
  return (
    <div className="atlas-app live-app">
      <aside className="rail">
        <button
          className="rail-logo"
          aria-label="Rich Birds — карта"
          onClick={() => go("map")}
        >
          <Bird size={30} />
        </button>
        <div className="rail-divider" />
        <nav>
          {[
            ["map", Layers, "Карта"],
            ["market", Store, "Маркет"],
            ["lands", Grid2X2, "Мои земли"],
            ["birds", Bird, "Птицы"],
            ["profile", UserRound, "Профиль"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              className={
                modal === id || (!modal && id === "map") ? "active" : ""
              }
              aria-label={label}
              onClick={() => go(id)}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <button aria-label="О проекте" onClick={() => go("about")}>
            <Info size={20} />
          </button>
          <span>RB / 05</span>
        </div>
      </aside>
      <header className="game-header">
        <button className="wordmark" onClick={() => go("map")}>
          RICH BIRDS<span>VOXEL WORLD / LAND EXPLORER</span>
        </button>
        <div className="header-divider" />
        <button className="my-lands" onClick={() => go("lands")}>
          <Box size={16} /> Мои земли {lands.length ? `(${lands.length})` : ""}
          <ArrowUpRight size={14} />
        </button>
        <div className="header-right">
          <span className="network-label">
            <i />
            {wallet.chain?.name || "Подключение к серверу…"}
          </span>
          <button
            className="connect"
            disabled={!wallet.ready || wallet.busy}
            onClick={() => go("wallet")}
          >
            <Wallet size={16} />
            <span>
              {wallet.busy
                ? "Подтверждение…"
                : shortAddress || "Подключить кошелёк"}
            </span>
            <ArrowUpRight size={15} />
          </button>
          <button
            className="header-profile"
            aria-label={`Профиль: ${nickname}`}
            title={nickname}
            onClick={() => go("profile")}
          >
            {wallet.profile ? (
              <AvatarImage avatar={wallet.profile.avatar} name={nickname} />
            ) : (
              <UserRound size={23} />
            )}
          </button>
        </div>
      </header>
      <main className={`atlas-main ${panel ? "has-panel" : ""}`}>
        <section className="land-map" aria-label="Карта земель">
          <canvas
            ref={canvas}
            tabIndex={0}
            aria-label="Карта земель. Стрелки — перемещение, плюс и минус — масштаб, Enter — выбор."
          />
          <div className="map-shading" />
          <div className="map-top">
            <div className="world-heading">
              <div className="overline">
                <span />
                RICH BIRDS METAVERSE
              </div>
              <h1>GENESIS VALLEY</h1>
              <p>Твоя земля. Твой аватар. Твоя история.</p>
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
                <button aria-label="Найти участок">
                  <ArrowRight size={15} />
                </button>
              </form>
              <button
                className="layers-button"
                aria-label={showAvatars ? "Скрыть аватары" : "Показать аватары"}
                onClick={() => setShowAvatars((v) => !v)}
              >
                <Layers size={17} />
              </button>
            </div>
          </div>
          <div className="map-filters">
            {[
              ["all", "Все земли"],
              ["free", "Каталог"],
              ["owned", "Мои участки"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={filter === id}
                className={filter === id ? "active" : ""}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {showAvatars &&
            frame.markers.map((m) => (
              <button
                key={m.id}
                className="cell-avatar"
                style={{ left: m.x, top: m.y, width: m.size, height: m.size }}
                title={`${m.name} · #${m.id}${m.illustration ? " · иллюстрация, не владелец" : ""}`}
                aria-label={`Участок ${m.id}: ${m.name}${m.illustration ? ", иллюстративный портрет" : ""}`}
                onClick={() => {
                  setSelected(m.id);
                  setPanel(true);
                }}
              >
                {m.avatar ? (
                  <AvatarImage avatar={m.avatar} />
                ) : (
                  <img src={m.src} alt={m.name} />
                )}
              </button>
            ))}
          {error && (
            <div className="map-error" role="alert">
              {error}
              <button aria-label="Закрыть ошибку" onClick={() => setError("")}>
                <X size={14} />
              </button>
            </div>
          )}
          {!panel && (
            <button className="reopen-panel" onClick={() => setPanel(true)}>
              <Box size={16} /> Участок #{selected}
              <ArrowRight size={14} />
            </button>
          )}
          <div className="map-bottom">
            <div className="map-legend">
              <span>
                <i className="free" />
                Каталог земель
              </span>
              <span>
                <i className="owned" />
                Мои участки
              </span>
            </div>
            <span className="map-hint">
              Перетаскивай карту · скролл для масштаба
            </span>
          </div>
          <div className="zoom-stack">
            <button
              aria-label="Увеличить карту"
              onClick={() => map.current.zoom(1.5)}
            >
              <Plus size={19} />
            </button>
            <span>{Math.round((frame.scale / INITIAL_ZOOM) * 100)}%</span>
            <button
              aria-label="Уменьшить карту"
              onClick={() => map.current.zoom(1 / 1.5)}
            >
              <Minus size={19} />
            </button>
            <button
              aria-label="Сбросить положение карты"
              onClick={() => map.current.reset()}
            >
              <LocateFixed size={19} />
            </button>
          </div>
          <div className="landmark-jump">
            <span>КРИПТО-ПОРТРЕТЫ</span>
            {LANDMARKS.map((l) => (
              <button
                key={l.id}
                title={l.caption}
                onClick={() => openLand(l.id)}
              >
                <img src={l.src} alt="" />
                {l.name}
              </button>
            ))}
          </div>
        </section>
        {panel && (
          <aside className="parcel-panel">
            <div className="panel-title">
              <span>
                <Box size={17} />
                Участок <strong>#{selected}</strong>
              </span>
              <button
                aria-label="Закрыть панель участка"
                onClick={() => setPanel(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="panel-scroll">
              <LandArt id={selected} />
              <div className="parcel-name-row">
                <h2>Твой уголок мира</h2>
                <span className={`parcel-status ${land ? "owned" : "free"}`}>
                  {land ? "Мой участок" : "В каталоге"}
                </span>
              </div>
              <p className="parcel-subtitle">
                <LocateFixed size={12} />
                Genesis Valley · X: {coords.x}, Y: {coords.y}
              </p>
              {land && wallet.profile && (
                <div className="owner-card">
                  <div className="owner-picture">
                    <AvatarImage avatar={wallet.profile.avatar} />
                  </div>
                  <div>
                    <span>ПРОФИЛЬ ВЛАДЕЛЬЦА</span>
                    <strong>{nickname}</strong>
                  </div>
                </div>
              )}
              {!land && landmark && (
                <div className="landmark-detail">
                  <img src={landmark.src} alt={landmark.name} />
                  <div>
                    <strong>{landmark.name}</strong>
                    <small>
                      Иллюстративный портрет. Не означает владение или поддержку
                      проекта.
                    </small>
                  </div>
                </div>
              )}
              <div className="price-line">
                <span>
                  Земля + курятник<small>Птицы приобретаются отдельно</small>
                </span>
                <strong>
                  {land ? "В кошельке" : "$1"}
                  <small>
                    {land ? "Проверка в сети" : "План первичной цены"}
                  </small>
                </strong>
              </div>
              {!land && (
                <button
                  className="enter-coop purchase-button"
                  onClick={() => go("purchase")}
                >
                  КУПИТЬ УЧАСТОК
                  <ArrowUpRight size={17} />
                </button>
              )}
              {land ? (
                <button
                  className="enter-coop"
                  disabled={checking}
                  onClick={enterCoop}
                >
                  {checking ? "Проверяем право доступа…" : "ВОЙТИ В КУРЯТНИК"}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div className="coop-locked">
                  <LockKeyhole size={16} />
                  <span>
                    Курятник откроется после покупки земли и подтверждения
                    владения.
                  </span>
                </div>
              )}
              <section className="panel-section">
                <h3>ОБ УЧАСТКЕ</h3>
                <dl>
                  <div>
                    <dt>Номер</dt>
                    <dd>#{selected}</dd>
                  </div>
                  <div>
                    <dt>Координаты</dt>
                    <dd>
                      {coords.x}, {coords.y}
                    </dd>
                  </div>
                  <div>
                    <dt>Сеть</dt>
                    <dd>{wallet.chain?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt>Газ сети</dt>
                    <dd>ETH</dd>
                  </div>
                </dl>
              </section>
              <p className="commerce-note">
                Продажи ещё не открыты. Контракты и платёжная валюта не
                настроены; средства не списываются.
              </p>
            </div>
          </aside>
        )}
      </main>
      <footer className="game-footer">
        <span>RICH BIRDS · VOXEL WORLD</span>
        <span>
          Портреты знаменитостей — иллюстрации, не владельцы и не партнёры
          проекта.
        </span>
        <button onClick={() => go("about")}>
          О проекте
          <ArrowUpRight size={10} />
        </button>
      </footer>
      {activeModal && (
        <Dialog
          key={`${activeModal}:${wallet.address || "guest"}`}
          dismissible={!registrationRequired && !wallet.busy}
          close={() => setModal(null)}
        >
          {activeModal === "registration" ? (
            <>
              <ProfileEditor
                profile={null}
                onSave={async (p) => {
                  await wallet.saveProfile(p);
                  setModal(null);
                }}
              />
              <button
                className="wallet-secondary"
                onClick={async () => {
                  setModal(null);
                  await wallet.disconnect();
                }}
              >
                Отменить регистрацию и отключиться
              </button>
            </>
          ) : modal === "wallet" ? (
            <WalletPanel
              wallet={wallet}
              onConnect={beginConnection}
              onProfile={() => go("profile")}
            />
          ) : modal === "profile" ? (
            wallet.authenticated ? (
              <ProfileEditor
                profile={wallet.profile}
                onSave={async (p) => {
                  await wallet.saveProfile(p);
                  setModal(null);
                }}
              />
            ) : (
              <WalletPanel
                wallet={wallet}
                onConnect={beginConnection}
                onProfile={() => go("profile")}
              />
            )
          ) : modal === "purchase" ? (
            <>
              <span className="modal-eyebrow">ПОКУПКА ЗЕМЛИ</span>
              <h2>Участок #{selected}</h2>
              <LandArt id={selected} />
              <div className="terms">
                <div>
                  <span>Состав</span>
                  <strong>Земля + доступ к курятнику</strong>
                </div>
                <div>
                  <span>План первичной цены</span>
                  <strong>$1 · валюта не настроена</strong>
                </div>
                <div>
                  <span>Сеть</span>
                  <strong>{wallet.chain?.name || "Загрузка…"}</strong>
                </div>
                <div>
                  <span>Комиссия</span>
                  <strong>5% · порядок расчёта не утверждён</strong>
                </div>
              </div>
              <div className="modal-notice">
                <ShieldCheck size={24} />
                <span>
                  {wallet.commerce?.reason ||
                    "Продажи не открыты: нужны адреса контрактов и настройка платёжной валюты."}{" "}
                  Подключение кошелька и подпись входа не являются покупкой.
                </span>
              </div>
              {!wallet.authenticated ? (
                <button className="modal-primary" onClick={() => go("wallet")}>
                  <Wallet size={17} />
                  Подключить кошелёк и войти
                </button>
              ) : !wallet.profile ? (
                <button className="modal-primary" onClick={() => go("profile")}>
                  Создать профиль перед покупкой
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button className="modal-primary" disabled>
                  Оплата недоступна до запуска продаж
                </button>
              )}
            </>
          ) : modal === "market" ? (
            <>
              <span className="modal-eyebrow">МАРКЕТ RICH BIRDS</span>
              <h2>Земли и птицы</h2>
              <div className="market-tabs">
                {[
                  ["lands", "Земли"],
                  ["birds", "Птицы"],
                ].map(([id, title]) => (
                  <button
                    key={id}
                    aria-pressed={marketTab === id}
                    onClick={() => setMarketTab(id)}
                  >
                    {title}
                  </button>
                ))}
              </div>
              {marketTab === "lands" ? (
                <>
                  <p>
                    Каталог первичных участков. После запуска контрактов здесь
                    появятся доступные покупки и предложения владельцев.
                  </p>
                  <div className="land-catalog">
                    {[48217, 48220, 47012, 49022].map((id) => (
                      <button key={id} onClick={() => openLand(id)}>
                        <LandArt id={id} />
                        <strong>Участок #{id}</strong>
                        <small>
                          X {coordinates(id).x} · Y {coordinates(id).y}
                        </small>
                        <span>
                          Открыть участок
                          <ArrowUpRight size={14} />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p>Коллекция птиц. Торги пока не открыты.</p>
                  <BirdCatalog />
                </>
              )}
            </>
          ) : modal === "lands" ? (
            <>
              <span className="modal-eyebrow">ЗЕМЛИ ТВОЕГО КОШЕЛЬКА</span>
              <h2>Мои земли</h2>
              {lands.length ? (
                <div className="my-land-list">
                  {lands.map((l) => (
                    <button key={l.id} onClick={() => openLand(l.id)}>
                      {wallet.profile && (
                        <AvatarImage avatar={wallet.profile.avatar} />
                      )}
                      <strong>Участок #{l.id}</strong>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-land">
                  <Grid2X2 size={40} />
                  <p>
                    {wallet.authenticated
                      ? "Подтверждённых участков пока нет. Покупки станут доступны после запуска контрактов."
                      : "Подключи кошелёк и подтверди вход, чтобы увидеть свои земли."}
                  </p>
                </div>
              )}
              <button
                className="modal-primary"
                onClick={() => go(wallet.authenticated ? "market" : "wallet")}
              >
                {wallet.authenticated ? "Открыть маркет" : "Подключить кошелёк"}
                <ArrowRight size={16} />
              </button>
            </>
          ) : modal === "birds" ? (
            <>
              <span className="modal-eyebrow">КОЛЛЕКЦИЯ RICH BIRDS</span>
              <h2>Птицы</h2>
              <p>
                Каталог персонажей, не баланс NFT кошелька. Торги пока не
                открыты.
              </p>
              <BirdCatalog />
            </>
          ) : modal === "coop" ? (
            access.allowed && wallet.authenticated ? (
              <>
                <span className="modal-eyebrow">УЧАСТОК #{selected}</span>
                <h2>Твой курятник</h2>
                <div className="coop-sketch">
                  <div className="coop-window" />
                  <div className="coop-beam" />
                  <div className="coop-floor" />
                  <div className="coop-perch" />
                </div>
                <p>
                  Право доступа проверено сервером по владельцу NFT. Размещение
                  NFT-птиц будет подключено отдельным этапом.
                </p>
              </>
            ) : (
              <>
                <LockKeyhole size={32} />
                <h2>Доступ закрыт</h2>
                <p>
                  Владение участком не подтверждено. Подключи правильный кошелёк
                  и открой курятник заново.
                </p>
              </>
            )
          ) : (
            <>
              <span className="modal-eyebrow">RICH BIRDS / VOXEL WORLD</span>
              <h2>Твоя земля. Твой аватар.</h2>
              <p>
                Аватар занимает ровно одну клетку участка и увеличивается вместе
                с картой. Портреты Виталика Бутерина, CZ и Майкла Сэйлора —
                декоративные иллюстрации, не заявления об их участии.
              </p>
              <div className="modal-notice">
                Кошелёк подключается через установленное EVM-расширение. Вход
                подтверждается подписью, профиль сохраняется в серверной БД.
                Оплата и выпуск NFT не включены: сначала развёртывание и
                проверка контрактов.
              </div>
              <p>
                Сейчас используется {wallet.chain?.name || "Robinhood Chain"}.
                ETH — газ сети, не выбранная платёжная валюта земель.
              </p>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
function LandArt({ id }) {
  return (
    <div className="parcel-art">
      <div className="parcel-art-grid" />
      <div className="island-art">
        <div className="voxel-tree t1" />
        <div className="voxel-tree t2" />
        <div className="little-house">
          <i />
          <b />
          <em />
        </div>
        <div className="island-stone" />
        <div className="island-grass" />
        <span className="flower f1" />
        <span className="flower f2" />
      </div>
      <span className="art-tag">LAND COLLECTION</span>
      <span className="art-id">#{id}</span>
    </div>
  );
}
function BirdCatalog() {
  return (
    <div className="collection-grid">
      {birds.map((b, i) => (
        <div className="collection-card" key={b.id}>
          <svg viewBox="0 0 100 100" role="img" aria-label={b.name}>
            <path d="M24 39H34V24H66V37H76V72H65V79H35V72H24Z" fill={b.color} />
            <path d="M34 34H44V44H34ZM55 34H65V44H55Z" fill="#fff9e4" />
            <path d="M39 36H44V43H39ZM55 36H60V43H55Z" fill="#122433" />
            <path d="M44 44H56V51H49V56H44Z" fill="#e8944c" />
            <path d="M35 58H65V70H57V77H40V70H35Z" fill={b.background} />
          </svg>
          <strong>{b.name}</strong>
          <small>{b.kind}</small>
        </div>
      ))}
    </div>
  );
}
function Dialog({ children, close, dismissible = true }) {
  const ref = useRef();
  const closeRef = useRef();
  closeRef.current = () => {
    if (dismissible) close();
  };
  useEffect(() => {
    const previous = document.activeElement,
      root = ref.current;
    const get = () => [
      ...root.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),a[href]",
      ),
    ];
    get()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeRef.current();
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
        if (e.target === e.currentTarget) closeRef.current();
      }}
    >
      <section
        className="game-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Rich Birds"
      >
        {dismissible && (
          <button
            className="dialog-close"
            aria-label="Закрыть окно"
            onClick={close}
          >
            <X size={20} />
          </button>
        )}
        {children}
      </section>
    </div>
  );
}
