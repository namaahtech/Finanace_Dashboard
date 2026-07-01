import React from "react";
import type { TemplateData } from "@/lib/onboarding/types";
import { DocStyle, DocShell } from "./docStyles";
import { PaginatedDoc } from "./PaginatedDoc";
import { buildHandbookBlocks } from "./blocks";

export function HandbookTemplate({ data, withStyle = true, paged = false }: { data: TemplateData; withStyle?: boolean; paged?: boolean }) {
  const blocks = buildHandbookBlocks(data);
  return (
    <>
      {withStyle && <DocStyle />}
      {paged ? <DocShell paged>{blocks}</DocShell> : <PaginatedDoc blocks={blocks} />}
    </>
  );
}
