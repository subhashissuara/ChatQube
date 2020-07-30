export const production = true; // true for deployment, false for Dev

// const domain = production ? '104.211.213.174' : '127.0.0.1:3001';
const domain = '127.0.0.1:3001';
export const webSocketUrl = `ws://${domain}`;
export const backendApiURL = `http://${domain}`;