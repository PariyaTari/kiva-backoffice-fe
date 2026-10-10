"use client";

import { DragEvent, useRef, useState } from "react";
import classNames from "classnames";
import { useMutation } from "@tanstack/react-query";
import { PanelEndpoints } from "@/app/(panel)/_api/panelEndpoints";
import { Icon } from "@/app/_components/icon/icons";
import { MediaAsset, MediaPurpose } from "@/types/common.type";
import { toPersianDigits } from "@/utils/digits";
import { generateID } from "@/utils/generateId";
import { withMappedError } from "@/utils/withMappedError";

type Pending = { key: string; name: string; preview: string | null; video: boolean; progress: number; error: string | null; abort: AbortController };

type MediaUploaderProps = {
	purpose: MediaPurpose;
	/** One finished asset — the parent adds it to its own list (with view, order item, …). */
	onUploaded: (asset: MediaAsset) => void;
	accept?: string;
	multiple?: boolean;
	/** Short line under the drop zone title. */
	hint?: string;
	disabled?: boolean;
};

/**
 * Step one of every media field (FEATURES §8): files go up to `POST /admin/media` one by one, each tile with its
 * progress and a cancel; a finished file leaves the uploader as a `MediaAsset` (`onUploaded`) and the parent
 * shows it. A failed file stays here with the server's reason until it is dismissed.
 */
export default function MediaUploader({ purpose, onUploaded, accept = "image/*", multiple = true, hint, disabled = false }: MediaUploaderProps) {
	const input = useRef<HTMLInputElement>(null);
	const [pending, setPending] = useState<Pending[]>([]);
	const [drag, setDrag] = useState(false);

	const patch = (key: string, change: Partial<Pending>) => setPending((list) => list.map((p) => (p.key === key ? { ...p, ...change } : p)));
	const drop = (key: string) =>
		setPending((list) => {
			const gone = list.find((p) => p.key === key);
			if (gone?.preview) URL.revokeObjectURL(gone.preview);
			return list.filter((p) => p.key !== key);
		});

	// one mutation, many calls: the hook-level callbacks run for every file (the per-call ones only for the last)
	const upload = useMutation({
		mutationFn: ({ file, key, signal }: { file: File; key: string; signal: AbortSignal }) =>
			withMappedError(() => PanelEndpoints.uploadMedia(file, purpose, null, (progress) => patch(key, { progress }), signal)),
		onSuccess: (asset, { key }) => {
			drop(key);
			onUploaded(asset);
		},
		// the reason stays on the tile (type / size / network) — it is the answer for that file
		onError: (e, { key }) => {
			if (e.description === "canceled") drop(key);
			else patch(key, { error: e.description });
		},
	});

	const add = (files: FileList | null) => {
		if (!files?.length || disabled) return;
		const picked = Array.from(files).slice(0, multiple ? undefined : 1);
		const next = picked.map((file) => ({
			file,
			tile: {
				key: generateID(),
				name: file.name,
				preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
				video: file.type.startsWith("video/"),
				progress: 0,
				error: null,
				abort: new AbortController(),
			} satisfies Pending,
		}));
		setPending((list) => [...list, ...next.map((n) => n.tile)]);
		next.forEach(({ file, tile }) => upload.mutate({ file, key: tile.key, signal: tile.abort.signal }));
		if (input.current) input.current.value = "";
	};

	const onDrop = (e: DragEvent<HTMLLabelElement>) => {
		e.preventDefault();
		setDrag(false);
		add(e.dataTransfer.files);
	};

	return (
		<div>
			<label
				className={classNames("upl", { drag })}
				onDragOver={(e) => {
					e.preventDefault();
					setDrag(true);
				}}
				onDragLeave={() => setDrag(false)}
				onDrop={onDrop}
				aria-disabled={disabled || undefined}
			>
				<input ref={input} type="file" accept={accept} multiple={multiple} disabled={disabled} onChange={(e) => add(e.target.files)} />
				<Icon name="upload" />
				<b>{multiple ? "فایل‌ها رو بکش این‌جا یا انتخاب کن" : "فایل رو بکش این‌جا یا انتخاب کن"}</b>
				{hint && <span>{hint}</span>}
			</label>
			{!!pending.length && (
				<div className="upl-grid">
					{pending.map((p) => (
						<div key={p.key} className={classNames("upl-item", { err: !!p.error })}>
							<div className="ph">
								{/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL) */}
								{p.preview ? <img src={p.preview} alt="" /> : <Icon name={p.video ? "video" : "image"} />}
							</div>
							<button
								type="button"
								className="x"
								aria-label={p.error ? "بستن" : "لغو آپلود"}
								onClick={() => (p.error ? drop(p.key) : p.abort.abort())}
							>
								<Icon name="close" />
							</button>
							<div className="meta">
								{p.error ? (
									<span>{p.error}</span>
								) : (
									<>
										<span className="bar">
											<i style={{ width: `${p.progress}%` }} />
										</span>
										<small className="muted">{toPersianDigits(p.progress)}٪</small>
									</>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
