export const generateOrderTextPickup = (
  order,
  customerName,
  direction,
  customerPhone
) => {
  return (
    "\n" +
    `Fecha: ${new Date().toLocaleString()}` +
    "\n" +
    "\n" +
    order +
    "\n" +
    `Nombre cliente: ${customerName}` +
    "\n" +
    `Número del cliente: ${customerPhone.replace("506", "")}` +
    "\n" +
    `Retiro en sucursal: ${direction}`
  );
};
export const generateOrderTextExpress = (
  order,
  customerName,
  direction,
  customerPhone
) => {
  return (
    "\n" +
    `Fecha: ${new Date().toLocaleString()}` +
    "\n" +
    "\n" +
    order +
    "\n" +
    `Nombre cliente: ${customerName}` +
    "\n" +
    `Número del cliente: ${customerPhone.replace("506", "")}` +
    "\n" +
    `Servicio Express: ${direction}`
  );
};
