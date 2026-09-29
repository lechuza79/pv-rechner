import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({create:vi.fn(), confirm:vi.fn()}));
vi.mock("../gemeinde-abo", () => ({aboAnlegen:mocks.create, aboBestaetigen:mocks.confirm}));
import { handOffSubscription } from "../video-export-abo";
import { VIDEO_ABO_EINWILLIGUNG, einwilligungsFassung } from "../abo-einwilligung";
const input={ags:"06440016",email:"test@example.invalid",consentVersion:VIDEO_ABO_EINWILLIGUNG.version,ip:null};
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("VIDEO_EXPORT_DATABASE_URL", ""); });
describe("confirmed video subscription", () => {
  it("confirms the separately selected subscription without another mail",async()=>{
    mocks.create.mockResolvedValue({art:"bestaetigung-noetig",abo:{id:"abo"}});
    mocks.confirm.mockResolvedValue({ok:true});
    expect(await handOffSubscription(input)).toBe("handed_off");
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({email:input.email,regionId:input.ags,einwilligungVersion:input.consentVersion}));
    expect(mocks.confirm).toHaveBeenCalledWith("abo",expect.any(String));
  });
  it("does not duplicate an existing subscription",async()=>{
    mocks.create.mockResolvedValue({art:"schon-angemeldet"});
    expect(await handOffSubscription(input)).toBe("handed_off");
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("does not turn a refused signup into a confirmed subscription",async()=>{
    mocks.create.mockResolvedValue({art:"still"});
    expect(await handOffSubscription(input)).toBe("failed");
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("retains the exact compact wording independently of the standard signup",()=>{
    expect(einwilligungsFassung(input.consentVersion)).toBe(VIDEO_ABO_EINWILLIGUNG);
  });
});
