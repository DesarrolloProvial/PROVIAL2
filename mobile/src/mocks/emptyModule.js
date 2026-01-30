// Mock vacío para módulos nativos que no soportan web
export default {};
export const requestPermissionsAsync = async () => ({ status: 'denied' });
export const getPermissionsAsync = async () => ({ status: 'denied' });
export const saveToLibraryAsync = async () => {};
export const createAssetAsync = async () => null;
export const getAlbumsAsync = async () => [];
export const getAssetsAsync = async () => ({ assets: [], totalCount: 0 });
