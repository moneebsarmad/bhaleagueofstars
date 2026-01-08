import Image from "next/image";
import { schoolConfig } from "@/lib/school.config";

type LoadingStateProps = {
  label?: string;
};

export default function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Image
        src={schoolConfig.crestLogo}
        alt={`${schoolConfig.systemName} crest`}
        width={96}
        height={96}
        className="object-contain mb-4 animate-pulse"
      />
      <p className="text-sm text-[#1a1a2e]/60">{label}</p>
    </div>
  );
}
