import React, { useState, useRef, useEffect } from "react";
import { Upload, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { AVATARS } from "./avatars.js";
import { DEFAULT_AVATAR } from "./demo-state.js";

export function AvatarImage({ avatar = DEFAULT_AVATAR, name = "", ...props }) {
  const src =
    avatar.kind === "upload" ? avatar.src : AVATARS[avatar.index]?.src;
  return <img src={src} alt={name} className="voxel-avatar" {...props} />;
}
export async function normalizeAvatar(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Поддерживаются PNG, JPEG и WebP. SVG не допускается.");
  if (file.size > 2 * 1024 * 1024)
    throw new Error("Размер изображения — не более 2 МБ.");
  const image = await createImageBitmap(file);
  try {
    if (!image.width || !image.height || image.width * image.height > 20000000)
      throw new Error("Изображение слишком большое: максимум 20 мегапикселей.");
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    const side = Math.min(image.width, image.height);
    context.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );
    return { kind: "upload", src: canvas.toDataURL("image/png") };
  } finally {
    image.close();
  }
}
export function ProfileEditor({ profile, onSave }) {
  const [nickname, setNickname] = useState(profile?.nickname || ""),
    [avatar, setAvatar] = useState(profile?.avatar || null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const a = await normalizeAvatar(file);
      if (id === request.current) setAvatar(a);
    } catch (err) {
      if (id === request.current)
        setError(
          err.message ||
            "Изображение не удалось прочитать. Выбери другой файл.",
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    if (!nickname.trim() || !avatar) {
      setError("Укажи ник и выбери или загрузи аватар.");
      return;
    }
    try {
      onSave({ nickname, avatar });
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form className="profile-editor" onSubmit={submit}>
      <span className="modal-eyebrow">
        {profile ? "ТВОЙ ПРОФИЛЬ" : "ШАГ 1 / ЗНАКОМСТВО"} · ДЕМО-РЕЖИМ
      </span>
      <h2>{profile ? "Твой облик в мире" : "Как тебя узнает этот мир?"}</h2>
      <p className="editor-intro">
        Этот аватар появится на твоих демо-землях. В релизе профиль будет связан
        с кошельком после входа по подписи.
      </p>
      <div className="profile-preview">
        <div>
          {avatar ? (
            <AvatarImage avatar={avatar} name="Предпросмотр аватара" />
          ) : (
            <UserPlaceholder />
          )}
        </div>
        <span>
          <strong>{nickname.trim() || "Твой будущий ник"}</strong>
          <small>
            {avatar?.kind === "upload"
              ? "Собственное изображение"
              : avatar
                ? AVATARS[avatar.index].name
                : "Выбери одного из 15 героев или загрузи свой"}
          </small>
          <em>Так тебя увидят на карте</em>
        </span>
      </div>
      <label className="profile-input">
        Ник
        <input
          value={nickname}
          maxLength={24}
          autoComplete="nickname"
          placeholder="Например, PixelExplorer"
          onChange={(e) => setNickname(e.target.value)}
          required
        />
      </label>
      <div className="avatar-choice-heading">
        <h3>15 ОРИГИНАЛЬНЫХ ГЕРОЕВ</h3>
        <span>ВОКСЕЛЬНАЯ КОЛЛЕКЦИЯ</span>
      </div>
      <div className="avatar-options">
        {AVATARS.map((a, i) => (
          <button
            type="button"
            key={a.id}
            aria-label={`Выбрать аватар ${i + 1}: ${a.name}`}
            aria-pressed={avatar?.kind === "preset" && avatar.index === i}
            onClick={() => {
              request.current++;
              setBusy(false);
              setError("");
              setAvatar({ kind: "preset", index: i });
            }}
            title={a.name}
          >
            <AvatarImage avatar={{ kind: "preset", index: i }} />
            <span className="avatar-option-name">{a.name}</span>
            {avatar?.kind === "preset" && avatar.index === i && (
              <Check size={14} />
            )}
          </button>
        ))}
      </div>
      <label className="avatar-upload">
        <Upload size={19} />
        <span>
          <strong>
            {busy ? "Обработка изображения…" : "Загрузить свой аватар"}
          </strong>
          <small>PNG, JPEG, WebP · до 2 МБ · обрезка по центру</small>
        </span>
        <input
          aria-label="Загрузить свой аватар"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={upload}
        />
      </label>
      {error && (
        <div className="editor-error" role="alert">
          {error}
        </div>
      )}
      <button className="modal-primary" type="submit" disabled={busy}>
        {profile ? "Сохранить профиль" : "Создать демо-профиль"}
        <ArrowRight size={16} />
      </button>
      <p className="local-privacy">
        <ShieldCheck size={13} /> Сохраняется только в этом браузере. Не
        регистрация кошелька, не загрузка на сервер.
      </p>
    </form>
  );
}
function UserPlaceholder() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M25 12H55V42H25ZM15 50H65V74H15Z" fill="#416275" />
      <path d="M33 23H38V29H33ZM46 23H51V29H46Z" fill="#91b2b8" />
    </svg>
  );
}
