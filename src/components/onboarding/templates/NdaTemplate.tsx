import React from "react";
import type { TemplateData } from "@/lib/onboarding/types";
import { DocStyle, DocShell } from "./docStyles";
import { PaginatedDoc } from "./PaginatedDoc";
import { buildNdaBlocks } from "./blocks";

export function NdaTemplate({ data, withStyle = true, paged = false }: { data: TemplateData; withStyle?: boolean; paged?: boolean }) {
  const blocks = buildNdaBlocks(data);
  return (
    <>
      {withStyle && <DocStyle />}
      {paged ? <DocShell paged>{blocks}</DocShell> : <PaginatedDoc blocks={blocks} />}
    </>
  );
}
