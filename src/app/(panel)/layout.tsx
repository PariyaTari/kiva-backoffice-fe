import { Suspense } from "react";
import Loading from "@/app/_components/common/loading/loading";
import PanelShell from "./_components/panelShell/panelShell";

/**
 * Every panel route — behind the session and role gate, inside the sidebar shell. List pages keep their filters in
 * the URL (`useSearchParams`), hence the `<Suspense>`.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
	return (
		<PanelShell>
			<Suspense fallback={<Loading />}>{children}</Suspense>
		</PanelShell>
	);
}
