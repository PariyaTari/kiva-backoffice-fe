"use client";

import { Icon } from "@/app/_components/icon/icons";
import { MediaPurpose } from "@/types/common.type";
import MediaUploader from "../mediaUploader/mediaUploader";

export type PickedMedia = { id: string; url: string } | null;

type SingleMediaFieldProps = {
	label: string;
	labelNote?: string;
	purpose: MediaPurpose;
	value: PickedMedia;
	onChange: (value: PickedMedia) => void;
	error?: string | null | false;
	hint?: string;
	accept?: string;
};

/** One image of an entity (category, banner, post cover, testimonial screenshot): the current one, replace, remove. */
export default function SingleMediaField({ label, labelNote, purpose, value, onChange, error, hint, accept }: SingleMediaFieldProps) {
	return (
		<div className={`field${error ? " error" : ""}`}>
			<label>
				{label}
				{labelNote && <span className="opt"> ({labelNote})</span>}
			</label>
			{value ? (
				<div className="upl-one">
					<span className="ph">
						{/* eslint-disable-next-line @next/next/no-img-element -- media URL */}
						<img src={value.url} alt="" />
					</span>
					<span className="acts">
						<button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(null)}>
							<Icon name="trash" /> حذف عکس
						</button>
					</span>
				</div>
			) : (
				<MediaUploader purpose={purpose} accept={accept ?? "image/jpeg,image/png,image/webp"} multiple={false} hint={hint} onUploaded={(a) => onChange({ id: a.id, url: a.url })} />
			)}
			{error && <span className="err">{error}</span>}
		</div>
	);
}
