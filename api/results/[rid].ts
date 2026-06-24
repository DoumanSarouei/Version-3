function extractBaseAndTable(
  rawBase: string,
  rawTable: string
): { baseId: string; table: string } {
  const baseMatch = rawBase.match(/app[a-zA-Z0-9]{14,}/);
  const baseId = baseMatch ? baseMatch[0] : rawBase.trim();

  const tableFromBase = rawBase.match(/tbl[a-zA-Z0-9]{14,}/);
  const tableFromTable = rawTable.match(/tbl[a-zA-Z0-9]{14,}/);

  const table = tableFromTable
    ? tableFromTable[0]
    : tableFromBase
      ? tableFromBase[0]
      : rawTable.trim();

  return { baseId, table };
}

function normalizeKey(k: string): string {
  return k
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export default async function handler(req: any, res: any) {
  const ridRaw = req.query?.rid;
  const rid = Array.isArray(ridRaw) ? ridRaw[0] : ridRaw;

  const token = process.env.AIRTABLE_TOKEN;
  const rawBase = process.env.AIRTABLE_BASE_ID;
  const rawTable = process.env.AIRTABLE_TABLE;

  if (!token || !rawBase || !rawTable) {
    return res.status(500).json({
      error: "Airtable credentials not configured",
      debug: {
        hasToken: Boolean(token),
        hasBase: Boolean(rawBase),
        hasTable: Boolean(rawTable),
      },
    });
  }

  if (!rid) {
    return res.status(400).json({
      error: "Missing result id",
    });
  }

  const { baseId, table } = extractBaseAndTable(rawBase, rawTable);

  try {
    const isRecordId = /^rec[a-zA-Z0-9]{14}$/.test(rid);

    let record: { id: string; fields: Record<string, unknown> } | null = null;

    if (isRecordId) {
      const airtableUrl = `https://api.airtable.com/v0/${encodeURIComponent(
        baseId
      )}/${encodeURIComponent(table)}/${encodeURIComponent(rid)}`;

      const airtableResponse = await fetch(airtableUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (airtableResponse.ok) {
        record = await airtableResponse.json();
      } else if (airtableResponse.status !== 404) {
        const text = await airtableResponse.text();

        console.error("Airtable fetch by record ID failed:", {
          status: airtableResponse.status,
          body: text,
        });

        return res.status(502).json({
          error: "Airtable request failed",
          status: airtableResponse.status,
          body: text,
        });
      }
    }

    if (!record) {
      const target = String(rid).trim();

      const targetVariants = new Set([
        target,
        `res_${target}`,
        target.replace(/^res_/, ""),
      ]);

      const matchKeys = new Set(["result_id", "rid", "id", "result"]);

      let offset: string | undefined;
      let pages = 0;

      while (!record && pages < 20) {
        pages++;

        const params = new URLSearchParams({
          pageSize: "100",
        });

        if (offset) {
          params.set("offset", offset);
        }

        const airtableUrl =
          `https://api.airtable.com/v0/${encodeURIComponent(
            baseId
          )}/${encodeURIComponent(table)}` + `?${params.toString()}`;

        const airtableResponse = await fetch(airtableUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!airtableResponse.ok) {
          const text = await airtableResponse.text();

          console.error("Airtable list fetch failed:", {
            status: airtableResponse.status,
            body: text,
          });

          return res.status(502).json({
            error: "Airtable request failed",
            status: airtableResponse.status,
            body: text,
          });
        }

        const data = await airtableResponse.json();

        for (const rec of data.records ?? []) {
          for (const key of Object.keys(rec.fields ?? {})) {
            if (matchKeys.has(normalizeKey(key))) {
              const value = String(rec.fields[key] ?? "").trim();

              if (targetVariants.has(value)) {
                record = rec;
                break;
              }
            }
          }

          if (record) break;
        }

        offset = data.offset;

        if (!offset) break;
      }
    }

    if (!record) {
      return res.status(404).json({
        error: "Result not found",
        searchedFor: rid,
      });
    }

    const normalizedFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record.fields ?? {})) {
      normalizedFields[normalizeKey(key)] = value;
    }

    return res.status(200).json({
      id: record.id,
      fields: normalizedFields,
    });
  } catch (error: any) {
    console.error("Airtable proxy error:", error);

    return res.status(500).json({
      error: "Internal server error",
      message: error?.message ?? String(error),
    });
  }
}
