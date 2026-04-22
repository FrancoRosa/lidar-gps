import io from "socket.io-client"
const vercel = window.location.hostname.includes("vercel")

const host = vercel ? "localhost:10000" : window.location.hostname + ":10000"

const hostTilt = vercel
  ? "localhost:10001"
  : window.location.hostname + ":10001"

export const socket = io(`http://${host}`)
export const socketTilt = io(`http://${hostTilt}`)
