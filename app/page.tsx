import PVRechner from "./rechner";

export default function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return <PVRechner initialParams={searchParams} />;
}
