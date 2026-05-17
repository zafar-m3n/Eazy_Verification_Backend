function isValidDDMMYYYY(dateString) {
  if (!dateString || typeof dateString !== "string") {
    return false;
  }

  const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateString.match(regex);

  if (!match) {
    return false;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function convertDDMMYYYYToYYYYMMDD(dateString) {
  if (!dateString) {
    return null;
  }

  if (!isValidDDMMYYYY(dateString)) {
    throw new Error("Invalid date format. Expected DD-MM-YYYY.");
  }

  const [day, month, year] = dateString.split("-");

  return `${year}-${month}-${day}`;
}

function convertYYYYMMDDToDDMMYYYY(dateValue) {
  if (!dateValue) {
    return null;
  }

  let dateString = dateValue;

  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");

    return `${day}-${month}-${year}`;
  }

  if (typeof dateString !== "string") {
    return null;
  }

  const onlyDate = dateString.split("T")[0];
  const [year, month, day] = onlyDate.split("-");

  if (!year || !month || !day) {
    return null;
  }

  return `${day}-${month}-${year}`;
}

function formatDateTimeToDDMMYYYY(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

module.exports = {
  isValidDDMMYYYY,
  convertDDMMYYYYToYYYYMMDD,
  convertYYYYMMDDToDDMMYYYY,
  formatDateTimeToDDMMYYYY,
};
