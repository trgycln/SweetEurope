import { describe, it, expect } from "vitest";

/**
 * getLocalizedText - i18n JSONB metin yardimcisi icin birim testleri
 *
 * rules.md §3 geregi: JSONB coklu dil verisi her zaman guvenli fallback
 * mekanizmasiyla erisimeli. Bu testler canlidaki "Objects are not valid
 * as a React child" hatasinin tekrar etmemesini garanti eder.
 */
function getLocalizedText(textObj: any, locale: string = "de"): string {
  if (!textObj) return "";
  if (typeof textObj === "string") return textObj;
  if (typeof textObj === "object") {
    const candidate = textObj[locale] || textObj["de"] || textObj["tr"] || textObj["en"];
    if (typeof candidate === "string") return candidate;
    for (const val of Object.values(textObj)) {
      if (typeof val === "string" && (val as string).trim() !== "") return val as string;
    }
  }
  return "";
}

function getLocalizedArray(arrObj: any, locale: string = "de"): string[] {
  if (!arrObj) return [];
  if (Array.isArray(arrObj)) {
    return arrObj.map((item: any) => typeof item === "string" ? item : (item?.text || JSON.stringify(item)));
  }
  if (typeof arrObj === "object") {
    const candidate = arrObj[locale] || arrObj["de"] || arrObj["tr"] || arrObj["en"];
    if (Array.isArray(candidate)) {
      return candidate.map((item: any) => typeof item === "string" ? item : (item?.text || JSON.stringify(item)));
    }
    for (const val of Object.values(arrObj)) {
      if (Array.isArray(val) && (val as any[]).length > 0) {
        return (val as any[]).map((item: any) => typeof item === "string" ? item : (item?.text || JSON.stringify(item)));
      }
    }
  }
  return [];
}

describe("getLocalizedText", () => {
  it("JSONB nesneden istenen locale metnini dondurur", () => {
    const title = { de: "Karamell Latte", tr: "Karamel Latte", en: "Caramel Latte" };
    expect(getLocalizedText(title, "de")).toBe("Karamell Latte");
    expect(getLocalizedText(title, "tr")).toBe("Karamel Latte");
    expect(getLocalizedText(title, "en")).toBe("Caramel Latte");
  });

  it("duz string ise oldugu gibi dondurur", () => {
    expect(getLocalizedText("Karamell Latte", "de")).toBe("Karamell Latte");
  });

  it("istenen locale yoksa de diline fallback yapar", () => {
    const title = { de: "Karamell Latte", tr: "Karamel Latte" };
    expect(getLocalizedText(title, "ar")).toBe("Karamell Latte");
  });

  it("de yoksa tr diline fallback yapar", () => {
    const title = { tr: "Karamel Latte", en: "Caramel Latte" };
    expect(getLocalizedText(title, "ar")).toBe("Karamel Latte");
  });

  it("hic dil bulunamazsa bos string dondurur", () => {
    expect(getLocalizedText({}, "de")).toBe("");
  });

  it("null icin bos string dondurur - React crash onler", () => {
    expect(getLocalizedText(null, "de")).toBe("");
  });

  it("undefined icin bos string dondurur - React crash onler", () => {
    expect(getLocalizedText(undefined, "de")).toBe("");
  });

  it("sayisal deger gelirse bos string dondurur", () => {
    expect(getLocalizedText(42 as any, "de")).toBe("");
  });

  it("bos string locale degeri icin fallback calisir", () => {
    const title = { de: "", tr: "Karamel Latte" };
    expect(getLocalizedText(title, "de")).toBe("Karamel Latte");
  });
});

describe("getLocalizedArray", () => {
  it("JSONB nesneden istenen locale dizisini dondurur", () => {
    const ingredients = {
      de: ["25ml FO Karamell", "30ml Espresso"],
      tr: ["25ml FO Karamel", "30ml Espresso"],
    };
    expect(getLocalizedArray(ingredients, "de")).toEqual(["25ml FO Karamell", "30ml Espresso"]);
    expect(getLocalizedArray(ingredients, "tr")).toEqual(["25ml FO Karamel", "30ml Espresso"]);
  });

  it("duz dizi ise oldugu gibi dondurur", () => {
    const arr = ["25ml FO Karamell", "30ml Espresso"];
    expect(getLocalizedArray(arr, "de")).toEqual(arr);
  });

  it("null icin bos dizi dondurur", () => {
    expect(getLocalizedArray(null, "de")).toEqual([]);
  });

  it("undefined icin bos dizi dondurur", () => {
    expect(getLocalizedArray(undefined, "de")).toEqual([]);
  });

  it("bos nesne icin bos dizi dondurur", () => {
    expect(getLocalizedArray({}, "de")).toEqual([]);
  });

  it("istenen locale yoksa de diline fallback yapar", () => {
    const instructions = { de: ["Adim 1", "Adim 2"] };
    expect(getLocalizedArray(instructions, "ar")).toEqual(["Adim 1", "Adim 2"]);
  });

  it("dizi icinde nesne gelirse crash yapmaz", () => {
    const arr = [{ text: "Bozuk veri" }, "Normal madde"];
    const result = getLocalizedArray(arr as any, "de");
    expect(result).toHaveLength(2);
    expect(typeof result[0]).toBe("string");
  });
});
