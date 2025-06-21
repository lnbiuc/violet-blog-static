import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

// https://unstorage.unjs.io/
export const storage = createStorage({
  driver: memoryDriver(),
});
