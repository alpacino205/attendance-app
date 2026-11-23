/* =========================================================
   Student Attendance Management System
   Plain JavaScript. Data is saved in the browser's localStorage.

   Data shapes:
   students = [ { id: "S001", name: "Sample Student" }, ... ]
   records  = { "course name|2026-11-22": {
                  course: "Course Name",
                  date: "2026-11-22",
                  entries: [ { id, name, status } ]   // status: present | absent | unmarked
               } }
   ========================================================= */

const STUDENTS_KEY = "attendance_students";
const RECORDS_KEY = "attendance_records";

let students = loadData(STUDENTS_KEY, []); // the class list
let records = loadData(RECORDS_KEY, {});   // all saved attendance sessions
let currentMarks = {};                     // marks for the session on screen: { studentId: "present" | "absent" }

// ---------- Page elements ----------
const courseInput = document.getElementById("course-name");
const dateInput = document.getElementById("attendance-date");
const sessionMsg = document.getElementById("session-msg");
const studentForm = document.getElementById("student-form");
const studentIdInput = document.getElementById("student-id");
const studentNameInput = document.getElementById("student-name");
const studentMsg = document.getElementById("student-msg");
const classList = document.getElementById("class-list");
const listMsg = document.getElementById("list-msg");
const viewCourse = document.getElementById("view-course");
const viewDate = document.getElementById("view-date");
const viewMsg = document.getElementById("view-msg");
const viewResult = document.getElementById("view-result");

// ---------- Storage helpers ----------

// Read JSON from localStorage. Returns the fallback if nothing is saved or the data is broken.
function loadData(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch (error) {
    return fallback;
  }
}

// Save a value to localStorage as JSON. Returns true if it worked.
function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    showMessage(listMsg, "Could not save. Your browser may be blocking storage.", "error");
    return false;
  }
}

// ---------- Small helpers ----------

// Show a message in a status element. type is "error" or "success".
function showMessage(element, text, type) {
  element.textContent = text;
  element.className = "message " + (type || "");
}

// Today's date as YYYY-MM-DD (used as the default date).
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

// Build the key used to find a record: course name (lowercase) + date.
function recordKey(course, date) {
  return course.trim().toLowerCase() + "|" + date;
}

// Turn "present" into "Present", etc.
function statusLabel(status) {
  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  return "Not marked";
}

// ---------- Class session ----------

// When the course or date changes, load any saved marks for that session.
function loadSession() {
  currentMarks = {};
  const course = courseInput.value.trim();
  const date = dateInput.value;
  showMessage(sessionMsg, "", "");
  showMessage(listMsg, "", "");

  if (course && date) {
    const saved = records[recordKey(course, date)];
    if (saved) {
      saved.entries.forEach(function (entry) {
        if (entry.status !== "unmarked") currentMarks[entry.id] = entry.status;
      });
      showMessage(sessionMsg, "Loaded the saved record for this course and date.", "success");
    }
  }
  renderClassList();
}

// ---------- Students ----------

// Add a new student after checking the form.
function addStudent(event) {
  event.preventDefault();
  const id = studentIdInput.value.trim();
  const name = studentNameInput.value.trim();

  if (!id || !name) {
    showMessage(studentMsg, "Please enter both a student ID and a full name.", "error");
    return;
  }
  const duplicate = students.some(function (s) {
    return s.id.toLowerCase() === id.toLowerCase();
  });
  if (duplicate) {
    showMessage(studentMsg, "A student with ID " + id + " is already in the class list.", "error");
    return;
  }

  students.push({ id: id, name: name });
  if (saveData(STUDENTS_KEY, students)) {
    showMessage(studentMsg, name + " was added to the class list.", "success");
    studentForm.reset();
    studentIdInput.focus();
    renderClassList();
  }
}

// Remove a student from the class list (saved records keep their own copy).
function removeStudent(id) {
  const student = students.find(function (s) { return s.id === id; });
  if (!student) return;
  if (!confirm("Remove " + student.name + " from the class list?")) return;

  students = students.filter(function (s) { return s.id !== id; });
  delete currentMarks[id];
  saveData(STUDENTS_KEY, students);
  showMessage(studentMsg, student.name + " was removed from the class list.", "success");
  renderClassList();
}

// ---------- Marking attendance ----------

// Draw the class list with Present/Absent choices, then update the totals.
function renderClassList() {
  classList.innerHTML = "";

  if (students.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-text";
    empty.textContent = "No students yet. Add a student above to begin.";
    classList.appendChild(empty);
  }

  students.forEach(function (student, index) {
    const item = document.createElement("li");

    // Student ID and name
    const info = document.createElement("div");
    info.className = "student-info";
    const nameEl = document.createElement("strong");
    nameEl.textContent = student.name;
    const idEl = document.createElement("div");
    idEl.className = "student-id";
    idEl.textContent = "ID: " + student.id;
    info.appendChild(nameEl);
    info.appendChild(idEl);

    // Present / Absent radio buttons (grouped in a fieldset for screen readers)
    const group = document.createElement("fieldset");
    group.className = "choices";
    const legend = document.createElement("legend");
    legend.className = "visually-hidden";
    legend.style.cssText = "position:absolute;left:-9999px;";
    legend.textContent = "Attendance for " + student.name;
    group.appendChild(legend);
    ["present", "absent"].forEach(function (status) {
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "mark-" + index;
      radio.checked = currentMarks[student.id] === status;
      radio.addEventListener("change", function () {
        currentMarks[student.id] = status;
        updateSummary();
      });
      label.appendChild(radio);
      label.appendChild(document.createTextNode(statusLabel(status)));
      group.appendChild(label);
    });

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-danger";
    removeBtn.textContent = "Remove";
    removeBtn.setAttribute("aria-label", "Remove " + student.name);
    removeBtn.addEventListener("click", function () { removeStudent(student.id); });

    item.appendChild(info);
    item.appendChild(group);
    item.appendChild(removeBtn);
    classList.appendChild(item);
  });

  updateSummary();
}

// Count Present, Absent and Not yet marked, and show the totals.
function updateSummary() {
  let present = 0;
  let absent = 0;
  students.forEach(function (s) {
    if (currentMarks[s.id] === "present") present++;
    if (currentMarks[s.id] === "absent") absent++;
  });
  document.getElementById("count-present").textContent = present;
  document.getElementById("count-absent").textContent = absent;
  document.getElementById("count-unmarked").textContent = students.length - present - absent;
}

// Mark every student with the same status.
function markAll(status) {
  if (students.length === 0) {
    showMessage(listMsg, "Add at least one student first.", "error");
    return;
  }
  students.forEach(function (s) { currentMarks[s.id] = status; });
  showMessage(listMsg, "", "");
  renderClassList();
}

// Validate, then save the attendance for the chosen course and date.
function saveAttendance() {
  const course = courseInput.value.trim();
  const date = dateInput.value;

  if (!course) {
    showMessage(listMsg, "Please enter a course name before saving.", "error");
    courseInput.focus();
    return;
  }
  if (!date) {
    showMessage(listMsg, "Please select an attendance date before saving.", "error");
    dateInput.focus();
    return;
  }
  if (students.length === 0) {
    showMessage(listMsg, "Add at least one student before saving.", "error");
    return;
  }

  // Save a copy of each student's name and status so old records stay readable.
  records[recordKey(course, date)] = {
    course: course,
    date: date,
    entries: students.map(function (s) {
      return { id: s.id, name: s.name, status: currentMarks[s.id] || "unmarked" };
    })
  };

  if (saveData(RECORDS_KEY, records)) {
    showMessage(listMsg, "Attendance saved for " + course + " on " + date + ".", "success");
    fillCourseOptions(course, date);
  }
}

// ---------- Viewing saved records ----------

// Fill the course drop-down from saved records. Optionally pre-select a course and date.
function fillCourseOptions(selectCourse, selectDate) {
  const courses = [];
  Object.keys(records).forEach(function (key) {
    if (courses.indexOf(records[key].course) === -1) courses.push(records[key].course);
  });
  courses.sort();

  viewCourse.innerHTML = "";
  if (courses.length === 0) {
    viewCourse.appendChild(new Option("No saved records yet", ""));
    viewDate.innerHTML = "";
    viewResult.hidden = true;
    showMessage(viewMsg, "Save attendance in section 3 to see records here.", "");
    return;
  }
  courses.forEach(function (c) { viewCourse.appendChild(new Option(c, c)); });
  viewCourse.value = selectCourse && courses.indexOf(selectCourse) !== -1 ? selectCourse : courses[0];
  fillDateOptions(selectDate);
}

// Fill the date drop-down with the saved dates for the selected course (newest first).
function fillDateOptions(selectDate) {
  const course = viewCourse.value;
  const dates = Object.keys(records)
    .map(function (key) { return records[key]; })
    .filter(function (r) { return r.course === course; })
    .map(function (r) { return r.date; })
    .sort()
    .reverse();

  viewDate.innerHTML = "";
  dates.forEach(function (d) { viewDate.appendChild(new Option(d, d)); });
  if (selectDate && dates.indexOf(selectDate) !== -1) viewDate.value = selectDate;
  showRecord();
}

// Show the saved record for the selected course and date.
function showRecord() {
  const record = records[recordKey(viewCourse.value, viewDate.value)];
  if (!record) {
    viewResult.hidden = true;
    return;
  }
  showMessage(viewMsg, "", "");

  const body = document.getElementById("view-body");
  body.innerHTML = "";
  const counts = { present: 0, absent: 0, unmarked: 0 };

  record.entries.forEach(function (entry) {
    counts[entry.status]++;
    const row = document.createElement("tr");
    const idCell = document.createElement("td");
    const nameCell = document.createElement("td");
    const statusCell = document.createElement("td");
    idCell.textContent = entry.id;
    nameCell.textContent = entry.name;
    statusCell.textContent = statusLabel(entry.status);
    statusCell.className = "status-" + entry.status;
    row.appendChild(idCell);
    row.appendChild(nameCell);
    row.appendChild(statusCell);
    body.appendChild(row);
  });

  document.getElementById("view-summary").textContent =
    record.course + ", " + record.date + ": " + counts.present + " present, " +
    counts.absent + " absent, " + counts.unmarked + " not marked.";
  viewResult.hidden = false;
}

// Send the viewed record back to the marking section so it can be edited.
function editRecord() {
  const record = records[recordKey(viewCourse.value, viewDate.value)];
  if (!record) return;
  courseInput.value = record.course;
  dateInput.value = record.date;
  loadSession();
  showMessage(listMsg, "Editing this record. Change the marks, then press Save attendance.", "success");
  document.getElementById("list-heading").scrollIntoView({ behavior: "smooth" });
}

// ---------- Exporting to CSV ----------

// Wrap a value in quotes so commas in names don't break the CSV file.
// A leading = + - or @ could be read as a formula by Excel, so we add an apostrophe.
function csvCell(value) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

// Turn one saved record into CSV lines (one line per student).
function recordToLines(record) {
  return record.entries.map(function (entry) {
    return [record.course, record.date, entry.id, entry.name, statusLabel(entry.status)]
      .map(csvCell)
      .join(",");
  });
}

// Make a browser download from CSV text.
function downloadCsv(filename, lines) {
  const header = ["Course", "Date", "Student ID", "Full name", "Status"].map(csvCell).join(",");
  // The \uFEFF at the start helps Excel read names with special characters correctly.
  const text = "\uFEFF" + [header].concat(lines).join("\r\n");
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export only the record currently shown in section 4.
function exportRecord() {
  const record = records[recordKey(viewCourse.value, viewDate.value)];
  if (!record) {
    showMessage(viewMsg, "Choose a saved course and date first.", "error");
    return;
  }
  const safeCourse = record.course.replace(/[^a-z0-9]+/gi, "-");
  downloadCsv(safeCourse + "-" + record.date + ".csv", recordToLines(record));
  showMessage(viewMsg, "Downloaded the CSV file for " + record.course + " on " + record.date + ".", "success");
}

// Export every saved record into one CSV file.
function exportAllRecords() {
  const keys = Object.keys(records).sort();
  if (keys.length === 0) {
    showMessage(viewMsg, "There are no saved records to export.", "error");
    return;
  }
  let lines = [];
  keys.forEach(function (key) {
    lines = lines.concat(recordToLines(records[key]));
  });
  downloadCsv("all-attendance-records.csv", lines);
  showMessage(viewMsg, "Downloaded all saved records.", "success");
}

// ---------- Start the app ----------
dateInput.value = todayString();
courseInput.addEventListener("input", loadSession);
dateInput.addEventListener("change", loadSession);
studentForm.addEventListener("submit", addStudent);
document.getElementById("all-present").addEventListener("click", function () { markAll("present"); });
document.getElementById("all-absent").addEventListener("click", function () { markAll("absent"); });
document.getElementById("save-attendance").addEventListener("click", saveAttendance);
viewCourse.addEventListener("change", function () { fillDateOptions(); });
viewDate.addEventListener("change", showRecord);
document.getElementById("edit-record").addEventListener("click", editRecord);
document.getElementById("export-record").addEventListener("click", exportRecord);
document.getElementById("export-all").addEventListener("click", exportAllRecords);

renderClassList();
fillCourseOptions();