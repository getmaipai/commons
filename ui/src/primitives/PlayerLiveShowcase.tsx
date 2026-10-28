// RADIO-07 story: the Player with a live stream (a radio station) beside a normal item. Addresses are samples at
// example.com, so the Player shows its own empty state; nothing loads from the network.
import { Player } from "@/kit/primitives/Player";

export function PlayerLiveShowcase() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 p-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Live station (Now playing)</h3>
        <Player src="https://stream.example.com/jazz.mp3" kind="audio" title="Example Jazz Radio" subtitle="Jazz, United States" live />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Live station (mini bar)</h3>
        <Player src="https://stream.example.com/jazz.mp3" kind="audio" layout="mini" title="Example Jazz Radio" subtitle="Jazz, United States" live onExpand={() => {}} />
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">A song with a length (seek stays)</h3>
        <Player src="https://media.example.com/song.mp3" kind="audio" title="Sample song" subtitle="Sample artist" />
      </section>
    </div>
  );
}
