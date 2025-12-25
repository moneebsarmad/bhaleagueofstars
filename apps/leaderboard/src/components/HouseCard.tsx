import Image from "next/image";

interface House {
  rank: number;
  name: string;
  virtue: string;
  description: string;
  points: number;
  color: string;
  bgColor: string;
  logo?: string | null;
}

interface HouseCardProps {
  house: House;
}

export default function HouseCard({ house }: HouseCardProps) {
  return (
    <div
      className="relative rounded-lg overflow-hidden shadow-lg float-card"
      style={{
        borderLeft: `5px solid ${house.color}`,
        background: house.bgColor,
      }}
    >
      {/* Rank Badge */}
      <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-sm badge-gold">
        {house.rank}
      </div>

      <div className="p-4 pr-32">
        {/* House Name */}
        <h2
          className="text-2xl font-bold mb-1"
          style={{
            color: house.color,
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif"
          }}
        >
          {house.name}
        </h2>

        {/* Virtue */}
        <p
          className="italic text-lg mb-1"
          style={{
            color: house.color,
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif"
          }}
        >
          {house.virtue}
        </p>

        {/* Description */}
        <p
          className="text-sm mb-2"
          style={{
            color: "#4a4a4a",
            fontFamily: "var(--font-cinzel), 'Cinzel', sans-serif"
          }}
        >
          {house.description}
        </p>

        {/* Points */}
        <p
          className="text-4xl font-bold"
          style={{
            color: "#1a1a2e",
            fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif"
          }}
        >
          {house.points.toLocaleString()}
        </p>
      </div>

      {/* House Logo - Vertically Centered */}
      {house.logo ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-28 h-28">
          <Image
            src={house.logo}
            alt={`${house.name} Logo`}
            width={112}
            height={112}
            className="object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
