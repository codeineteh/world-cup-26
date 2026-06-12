import { fetchWorldCupMatches, WORLD_CUP_API_URL } from "../../../data/worldCupApi";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  try {
    const matches = await fetchWorldCupMatches();

    return Response.json(
      {
        source: WORLD_CUP_API_URL,
        fetchedAt: new Date().toISOString(),
        matches,
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to fetch World Cup data" },
      { status: 502, headers: noStoreHeaders }
    );
  }
}
