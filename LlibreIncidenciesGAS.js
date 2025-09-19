/**
 * @OnlyCurrentDoc
 * Projecte: SincroAlumnes
 * Versió Final: Sincronitzador intel·ligent de membres entre Classroom, Groups i Chat.
 * Desenvolupat per WorkspaceDev.
 * version sincroniza roles sin logs
 */

// --- CONSTANTS DE CONFIGURACIÓ ---
const CONFIG_SHEET_NAME = 'Configuració';
const CLASSROOM_LIST_SHEET_NAME = 'Llista Classrooms';
const GROUP_LIST_SHEET_NAME = 'Llista Groups';
const CHAT_LIST_SHEET_NAME = 'Llista Chats';
const STUDENTS_SHEET_NAME = 'Alumnes';
const TEACHERS_SHEET_NAME = 'Professors';
const MENU_NAME = 'Sincro Alumnes';

// --- Celda para señal de sincronización asíncrona ---
// Usamos una celda fuera del rango de datos normales, por ejemplo, Z1000
const SIGNAL_CELL = 'Configuració!Z1000'; 
const RESULT_CELL = 'Configuració!Z1001';

// --- FUNCIONS DEL MENÚ ---

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(MENU_NAME)
    .addItem('1. Crea les pestanyes i la seva estructura', 'crearEstructura')
    .addSeparator()
    .addItem('2. Sincronitza Llistes (Classroom/Groups/Chat)', 'actualitzarLlistes')
    .addItem('3. Actualitza Llista d\'Alumnes', 'actualitzarAlumnes')
    .addItem('4. Actualitza Llista de Professors', 'actualitzarProfessors')
    .addSeparator()
    .addItem('5. Sincronitza Membres (Alumnes i Professors)', 'sincronitzarMembres')
    .addToUi();
}

function crearEstructura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheetsToCreate = [
    { name: CONFIG_SHEET_NAME, headers: ['Actiu', 'Nom Classroom', 'Google Group associat', 'Google Chat associat', 'Estat Sincronització', 'ID Classroom'] },
    { name: CLASSROOM_LIST_SHEET_NAME, headers: ['Nom Classroom', 'URL', 'ID Classroom'] },
    { name: GROUP_LIST_SHEET_NAME, headers: ['Nom Group', 'URL'] },
    { name: CHAT_LIST_SHEET_NAME, headers: ['Nom Chat', 'URL', 'ID Chat'] },
    { name: STUDENTS_SHEET_NAME, headers: ['Nom Curs', 'Nom Alumne', 'Email Alumne'] },
    { name: TEACHERS_SHEET_NAME, headers: ['Nom Curs', 'Nom Professor', 'Email Professor'] }
  ];

  sheetsToCreate.forEach(sheetInfo => {
    let sheet = ss.getSheetByName(sheetInfo.name);
    if (!sheet) {
      sheet = ss.insertSheet(sheetInfo.name);
    }
    sheet.clear();
    sheet.appendRow(sheetInfo.headers);
    sheet.getRange(1, 1, 1, sheetInfo.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    if (sheetInfo.name === CONFIG_SHEET_NAME) {
      sheet.appendRow(['', '', '', '', '', '']);
    }
  });
  
  _aplicarValidacioDeDades();

  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  configSheet.hideColumns(configSheet.getLastColumn());
  const classroomListSheet = ss.getSheetByName(CLASSROOM_LIST_SHEET_NAME);
  classroomListSheet.hideColumns(classroomListSheet.getLastColumn());
  const chatListSheet = ss.getSheetByName(CHAT_LIST_SHEET_NAME);
  chatListSheet.hideColumns(chatListSheet.getLastColumn());
}

function actualitzarLlistes() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    _sincronitzarClassrooms();
    _sincronitzarGroups();
    _sincronitzarChats();
    
    _aplicarValidacioDeDades();

  } catch (e) {
    throw new Error(`Error durant la sincronització de llistes: ${e.message}`);
  }
}

function actualitzarAlumnes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  const studentsSheet = _getSheetAndClear(STUDENTS_SHEET_NAME);
  
  const configData = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, configSheet.getLastColumn()).getValues();
  const activeCourses = configData.filter(row => row[0] === true);

  if (activeCourses.length === 0) {
    throw new Error('No hi ha cap curs marcat com "Actiu" a la pestanya de configuració.');
  }
  
  let allStudentsData = [];
  activeCourses.forEach(row => {
    const courseName = row[1];
    const courseId = row[5];
    
    try {
      let pageToken;
      do {
        const response = Classroom.Courses.Students.list(courseId, { pageSize: 100, pageToken: pageToken });
        if (response.students) {
          const studentData = response.students.map(s => {
            let email = s.profile.emailAddress;
            if (!email && s.userId) {
              try {
                const user = AdminDirectory.Users.get(s.userId);
                email = user.primaryEmail;
              } catch (e) {
                email = `Email no accessible (ID: ${s.userId})`;
              }
            }
            return [courseName, s.profile.name.fullName, email];
          });
          allStudentsData = allStudentsData.concat(studentData);
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
    } catch(e) {
      throw new Error(`No s'ha pogut obtenir els alumnes del curs "${courseName}": ${e.message}`);
    }
  });

  if (allStudentsData.length > 0) {
    studentsSheet.getRange(2, 1, allStudentsData.length, 3).setValues(allStudentsData);
  }
}

function actualitzarProfessors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  const teachersSheet = _getSheetAndClear(TEACHERS_SHEET_NAME);
  
  const configData = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, configSheet.getLastColumn()).getValues();
  const activeCourses = configData.filter(row => row[0] === true);

  if (activeCourses.length === 0) {
    throw new Error('No hi ha cap curs marcat com "Actiu" a la pestanya de configuració.');
  }

  let allTeachersData = [];
  activeCourses.forEach(row => {
    const courseName = row[1];
    const courseId = row[5];
    
    try {
      let pageToken;
      do {
        const response = Classroom.Courses.Teachers.list(courseId, { pageSize: 100, pageToken: pageToken });
        if (response.teachers) {
          const teacherData = response.teachers.map(t => {
            let email = t.profile.emailAddress;
            return [courseName, t.profile.name.fullName, email];
          });
          allTeachersData = allTeachersData.concat(teacherData);
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
    } catch(e) {
      throw new Error(`No s'ha pogut obtenir els professors del curs "${courseName}": ${e.message}`);
    }
  });

  if (allTeachersData.length > 0) {
    teachersSheet.getRange(2, 1, allTeachersData.length, 3).setValues(allTeachersData);
  }
}

function sincronitzarMembres() {
  Logger.log("Iniciant sincronització de membres...");
  const startTime = new Date();
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  const studentsSheet = ss.getSheetByName(STUDENTS_SHEET_NAME);
  const teachersSheet = ss.getSheetByName(TEACHERS_SHEET_NAME);

  const PROTECTED_USER_EMAIL = 'secretaria@cfalapau.cat';

  const configData = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, configSheet.getLastColumn()).getValues();
  const studentData = studentsSheet.getRange(2, 1, studentsSheet.getLastRow() > 1 ? studentsSheet.getLastRow() - 1 : 1, 3).getValues();
  const teacherData = teachersSheet.getRange(2, 1, teachersSheet.getLastRow() > 1 ? teachersSheet.getLastRow() - 1 : 1, 3).getValues();

  const activeCourses = configData.map((row, index) => ({ data: row, rowIndex: index + 2 }))
                               .filter(item => item.data[0] === true);

  if (activeCourses.length === 0) {
    throw new Error('No hi ha cap curs marcat com "Actiu" per sincronitzar.');
  }

  let coursesProcessed = 0;
  const totalCourses = activeCourses.length;
  let errors = [];
  
  for (const item of activeCourses) {
    const rowData = item.data;
    const rowIndex = item.rowIndex;
    const [isActive, courseName, groupName, chatName] = rowData;
    const courseId = String(rowData[5]);
    const statusCell = configSheet.getRange(rowIndex, 5);
    
    coursesProcessed++;
    Logger.log(`Processant curs ${coursesProcessed}/${totalCourses}: ${courseName}`);

    try {
      statusCell.setValue(`Sincronitzant (${coursesProcessed}/${totalCourses})...`);
      SpreadsheetApp.flush();

      const cleanCourseName = courseName.replace('DEL - ', ''); 

      const targetStudents = new Set(
        studentData.filter(student => student[0] === cleanCourseName).map(student => student[2].toLowerCase())
      );
      
      const targetTeachers = new Set(
        teacherData.filter(teacher => teacher[0] === cleanCourseName).map(teacher => teacher[2].toLowerCase())
      );

      let summary = [];
      if (groupName) {
        Logger.log(`  Sincronitzant grup: ${groupName}`);
        const groupResult = _syncGroup(groupName, targetStudents, targetTeachers, PROTECTED_USER_EMAIL);
        summary.push(`Grup: ${groupResult}`);
        Logger.log(`  Resultat grup: ${groupResult}`);
      }
      if (chatName) {
        Logger.log(`  Sincronitzant chat: ${chatName}`);
        const chatResult = _syncChat(chatName, targetStudents, targetTeachers, PROTECTED_USER_EMAIL);
        summary.push(`Chat: ${chatResult}`);
        Logger.log(`  Resultat chat: ${chatResult}`);
      }

      statusCell.setValue(`Sincronitzat: ${new Date().toLocaleString()}. ${summary.join(' | ')}`);
    } catch (e) {
      const errorMsg = `Error durant la sincronització del curs ${courseName}: ${e.message}`;
      Logger.log(errorMsg);
      errors.push(errorMsg);
      statusCell.setValue(`Error: ${e.message}`);
      // No lanzamos el error, continuamos con los siguientes cursos
    }
  }
  
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000; // Duración en segundos
  Logger.log(`Sincronització de membres finalitzada. Cursos processats: ${coursesProcessed}, Errors: ${errors.length}, Temps total: ${duration} segons.`);
  
  if (errors.length > 0) {
      throw new Error(`Hi va haver errors en ${errors.length} cursos. Revisa els logs per a més detalls. Cursos amb error: ${errors.map(e => e.split(':')[2].trim()).join(', ')}`);
  }
}

function _getSheetAndClear(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  return sheet;
}

function _aplicarValidacioDeDades() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  
  configSheet.getRange('A:G').clearDataValidations();
  
  const groupListRange = ss.getSheetByName(GROUP_LIST_SHEET_NAME).getRange('A2:A');
  const chatListRange = ss.getSheetByName(CHAT_LIST_SHEET_NAME).getRange('A2:A');
  
  const groupRule = SpreadsheetApp.newDataValidation().requireValueInRange(groupListRange).setAllowInvalid(false).build();
  const chatRule = SpreadsheetApp.newDataValidation().requireValueInRange(chatListRange).setAllowInvalid(false).build();
  const checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();

  if (configSheet.getLastRow() > 1) {
    const range = configSheet.getRange(2, 1, configSheet.getLastRow() - 1);
    range.offset(0, 0, range.getNumRows(), 1).setDataValidation(checkboxRule);
    range.offset(0, 2, range.getNumRows(), 1).setDataValidation(groupRule);
    range.offset(0, 3, range.getNumRows(), 1).setDataValidation(chatRule);
  }
}

function _sincronitzarClassrooms() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  const listSheet = _getSheetAndClear(CLASSROOM_LIST_SHEET_NAME);

  const apiCoursesMap = new Map();
  let pageToken;
  do {
    const response = Classroom.Courses.list({ teacherId: 'me', courseStates: 'ACTIVE', pageSize: 500, pageToken: pageToken });
    if (response.courses) {
      response.courses.forEach(c => apiCoursesMap.set(c.id, { name: c.name, alternateLink: c.alternateLink }));
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  const courseData = Array.from(apiCoursesMap.entries()).map(([id, courseInfo]) => [courseInfo.name, courseInfo.alternateLink, id]);
  if (courseData.length > 0) {
    listSheet.getRange(2, 1, courseData.length, 3).setValues(courseData);
  }
  
  const sheetCoursesMap = new Map();
  if (configSheet.getLastRow() > 1) {
    const configData = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, configSheet.getLastColumn()).getValues();
    configData.forEach((row, index) => {
      const courseId = String(row[5]); 
      const courseName = row[1];
      if (courseId && courseId.trim() !== '') {
        sheetCoursesMap.set(courseId, { name: courseName, row: index + 2 });
      }
    });
  }

  const processedIds = new Set();
  apiCoursesMap.forEach((courseInfo, apiId) => { // ORDEN CORREGIDO AQUÍ
    if (sheetCoursesMap.has(apiId)) {
      const sheetCourse = sheetCoursesMap.get(apiId);
      if (sheetCourse.name !== courseInfo.name) {
        configSheet.getRange(sheetCourse.row, 2).setValue(courseInfo.name);
      }
    } else {
      configSheet.appendRow([false, courseInfo.name, '', '', '', apiId]);
    }
    processedIds.add(apiId);
  });

  sheetCoursesMap.forEach((sheetCourse, sheetId) => {
    if (!processedIds.has(sheetId) && !sheetCourse.name.startsWith('DEL - ')) {
      configSheet.getRange(sheetCourse.row, 2).setValue(`DEL - ${sheetCourse.name}`);
    }
  });
}

function _sincronitzarGroups() {
  const userEmail = Session.getActiveUser().getEmail(); 
  const groupSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GROUP_LIST_SHEET_NAME);
  const userDomain = userEmail.split('@')[1];
  const apiGroups = new Set(GroupsApp.getGroups().map(g => g.getEmail()));
  
  const processedEmails = new Set();
  const groupData = [];
  apiGroups.forEach(apiEmail => {
    const url = `https://groups.google.com/a/${userDomain}/g/${apiEmail.split('@')[0]}`;
    groupData.push([apiEmail, url]);
    processedEmails.add(apiEmail);
  });
  
  // AÑADIDO: Ordenar por nombre de grupo (columna A)
  groupData.sort((a, b) => a[0].localeCompare(b[0])); 
  
  if (groupData.length > 0) {
    _getSheetAndClear(GROUP_LIST_SHEET_NAME).getRange(2, 1, groupData.length, 2).setValues(groupData);
  }
}

function _sincronitzarChats() {
  const chatSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CHAT_LIST_SHEET_NAME);
  const apiChatsMap = new Map();
  let pageToken;
  do {
    const response = Chat.Spaces.list({ pageSize: 1000, pageToken: pageToken, filter: 'space_type = "SPACE"' });
    if (response.spaces) {
      response.spaces.forEach(s => apiChatsMap.set(s.name, s.displayName));
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  const sheetChatsMap = new Map();
  if (chatSheet.getLastRow() > 1) {
    const sheetData = chatSheet.getRange(2, 1, chatSheet.getLastRow() - 1, 3).getValues();
    sheetData.forEach((row, index) => {
      const chatName = row[0];
      const chatId = String(row[2] || '');
      if (chatId && chatId.trim() !== '') {
        sheetChatsMap.set(chatId, { name: chatName, row: index + 2 });
      }
    });
  }
  
  const processedIds = new Set();
  const chatData = [];
  apiChatsMap.forEach((apiName, apiId) => {
    const spaceIdClean = apiId.split('/').pop();
    const url = `https://chat.google.com/room/${spaceIdClean}`;
    chatData.push([apiName, url, apiId]);
    processedIds.add(apiId);
  });
  
  // AÑADIDO: Ordenar por nombre de chat (columna A)
  chatData.sort((a, b) => a[0].localeCompare(b[0])); 
  
  if (chatData.length > 0) {
    _getSheetAndClear(CHAT_LIST_SHEET_NAME).getRange(2, 1, chatData.length, 3).setValues(chatData);
  }

  sheetChatsMap.forEach((sheetChat, sheetId) => {
    if (!processedIds.has(sheetId) && !sheetChat.name.startsWith('DEL - ')) {
      _getSheetAndClear(CHAT_LIST_SHEET_NAME).getRange(sheetChat.row, 1).setValue(`DEL - ${sheetChat.name}`);
    }
  });
}

function _syncGroup(groupName, targetStudents, targetTeachers, protectedUser) {
  const group = GroupsApp.getGroupByEmail(groupName.replace('DEL - ', ''));
  if (!group) return `Grup "${groupName}" no trobat.`;

  const groupKey = group.getEmail();
  const currentMembers = AdminDirectory.Members.list(groupKey, { maxResults: 500, roles: 'OWNER,MANAGER,MEMBER' }).members || [];
  
  const targetManagers = new Set([...targetTeachers]);
  const targetMembers = new Set([...targetStudents]);

  let added = 0, removed = 0, updated = 0;

  const protectedMember = currentMembers.find(m => m.email.toLowerCase() === protectedUser);
  if (!protectedMember) {
    try {
      AdminDirectory.Members.insert({ email: protectedUser, role: 'OWNER' }, groupKey);
      added++;
    } catch (e) {
      if (e.message && e.message.includes('Member already exists')) {
      } else {
        throw e;
      }
    }
  } else if (protectedMember.role !== 'OWNER') {
    AdminDirectory.Members.update({ role: 'OWNER' }, groupKey, protectedMember.id);
    updated++;
  }

  const membersToAdd = new Map();
  const membersToUpdate = new Map();
  const membersToRemove = new Set();
  
  currentMembers.forEach(member => {
    const email = member.email.toLowerCase();
    if (email === protectedUser) return;

    if (targetManagers.has(email)) {
      if (member.role !== 'MANAGER') membersToUpdate.set(member.id, 'MANAGER');
    } else if (targetMembers.has(email)) {
      if (member.role !== 'MEMBER') membersToUpdate.set(member.id, 'MEMBER');
    } else {
      membersToRemove.add(member.id);
    }
  });

  targetManagers.forEach(email => {
    if (!currentMembers.some(m => m.email.toLowerCase() === email)) membersToAdd.set(email, 'MANAGER');
  });
  targetMembers.forEach(email => {
    if (!currentMembers.some(m => m.email.toLowerCase() === email) && !targetManagers.has(email)) membersToAdd.set(email, 'MEMBER');
  });

  membersToRemove.forEach(memberId => AdminDirectory.Members.remove(groupKey, memberId));
  removed = membersToRemove.size;
  
  membersToUpdate.forEach((role, memberId) => AdminDirectory.Members.update({ role: role }, groupKey, memberId));
  updated += membersToUpdate.size;
  
  membersToAdd.forEach((role, email) => {
    try {
      AdminDirectory.Members.insert({ email: email, role: role }, groupKey);
      added++;
    } catch (e) {
      if (e.message && e.message.includes('Member already exists')) {
      } else {
        throw e;
      }
    }
  });

  return `Afegits: ${added}, Esborrats: ${removed}, Actualitzats: ${updated}.`;
}

function _syncChat(chatName, targetStudents, targetTeachers, protectedUser) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const chatListSheet = ss.getSheetByName(CHAT_LIST_SHEET_NAME);
  const chatListData = chatListSheet.getRange(2, 1, chatListSheet.getLastRow() > 1 ? chatListSheet.getLastRow() - 1 : 1, 3).getValues();
  const chatMap = new Map(chatListData.map(row => [row[0], row[2]]));
  const spaceId = chatMap.get(chatName.replace('DEL - ', ''));

  if (!spaceId) return `Xat "${chatName}" no trobat a la llista.`;

  const allTargetUsers = new Set([...targetStudents, ...targetTeachers, protectedUser]);
  const userEmailToIdMap = new Map();
  
  allTargetUsers.forEach(email => {
    try {
      const user = AdminDirectory.Users.get(email);
      userEmailToIdMap.set(email, `users/${user.id}`);
    } catch(e) { 
    }
  });

  const currentMembers = Chat.Spaces.Members.list(spaceId, { pageSize: 1000 }).memberships || [];
  
  const targetManagers = new Set([...targetTeachers, protectedUser].map(email => userEmailToIdMap.get(email)).filter(id => id));
  const targetMembers = new Set([...targetStudents].map(email => userEmailToIdMap.get(email)).filter(id => id));

  let added = 0, removed = 0, updated = 0; 
  
  const membersToProcess = new Map(); // memberId -> { action: 'ADD'|'REMOVE'|'UPDATE_ROLE', role: 'ROLE_MEMBER'|'ROLE_MANAGER' }

  // Paso 1: Identificar miembros a eliminar o actualizar roles
  currentMembers.forEach(m => {
    const memberId = m.member.name; 
    const currentRole = m.role; 
    const membershipName = m.name; 

    const isTargetManager = targetManagers.has(memberId);
    const isTargetMember = targetMembers.has(memberId);

    if (isTargetManager) {
      // Si el rol actual no es ROLE_MANAGER, marcar para actualización
      if (currentRole !== 'ROLE_MANAGER') { 
        membersToProcess.set(memberId, { action: 'UPDATE_ROLE', membershipName: membershipName, role: 'ROLE_MANAGER' });
      } else {
      }
    } else if (isTargetMember) {
      // Si el rol actual no es ROLE_MEMBER, marcar para actualización
      if (currentRole !== 'ROLE_MEMBER') {
        membersToProcess.set(memberId, { action: 'UPDATE_ROLE', membershipName: membershipName, role: 'ROLE_MEMBER' });
      } else {
      }
    } else {
      // El miembro está en el chat pero no en las listas objetivo, marcar para eliminación
      membersToProcess.set(memberId, { action: 'REMOVE', membershipName: membershipName });
    }
  });

  // Paso 2: Identificar miembros a añadir (que no están actualmente en el espacio)
  const currentMemberIds = new Set(currentMembers.map(m => m.member.name));
  
  // Todos los nuevos miembros se añaden como ROLE_MEMBER primero
  allTargetUsers.forEach(email => {
    const memberId = userEmailToIdMap.get(email);
    if (memberId && !currentMemberIds.has(memberId) && !membersToProcess.has(memberId)) { // Asegurarse de que no se haya procesado ya
      membersToProcess.set(memberId, { action: 'ADD', role: 'ROLE_MEMBER' }); 
    }
  });

  // Paso 3: Ejecutar operaciones
  // Primero, ejecutar todas las eliminaciones
  membersToProcess.forEach((op, memberId) => {
    if (op.action === 'REMOVE') { 
      try {
        Chat.Spaces.Members.remove(op.membershipName);
        removed++;
      } catch (e) {
      }
    }
  });

  // Luego, ejecutar todas las adiciones
  membersToProcess.forEach((op, memberId) => {
    if (op.action === 'ADD') {
      try {
        Chat.Spaces.Members.create({ 
          role: op.role, 
          member: { 
            name: memberId,
            type: 'HUMAN' 
          } 
        }, spaceId);
        added++;
      } catch (e) {
        if (e.message && e.message.includes('already exists')) { 
        } else {
        }
      }
    }
  });

  // Finalmente, ejecutar todas las actualizaciones de rol (usando patch)
  membersToProcess.forEach((op, memberId) => {
    if (op.action === 'UPDATE_ROLE') { 
      try {
        Chat.Spaces.Members.patch(
          { role: op.role }, 
          op.membershipName, 
          { updateMask: 'role' } 
        );
        updated++;
      } catch (e) {
      }
    }
  });

  return `Afegits: ${added}, Esborrats: ${removed}, Actualitzats: ${updated}.`;
}

function createStudentsSheet(courseName, studentsData, groupName, teacherNames, newOwnerEmail) {
  // console.log(`[GAS createStudentsSheet] Received newOwnerEmail: ${newOwnerEmail}`);
  try {
    const ss = SpreadsheetApp.create(`Llista Alumnes - ${courseName}`);
    const sheet = ss.getActiveSheet();

    // Información del curso, grupo y profesores
    sheet.getRange('A1').setValue('Curs:');
    sheet.getRange('B1').setValue(courseName);
    sheet.getRange('A2').setValue('Grup Associat:');
    sheet.getRange('B2').setValue(groupName);
    sheet.getRange('A3').setValue('Professors:');
    sheet.getRange('B3').setValue(teacherNames.join(', '));

    // Dejar una fila en blanco para separación
    sheet.getRange('A4').setValue('');

    // Encabezados de la lista de alumnos
    sheet.getRange('A5').setValue('Nom Alumne');
    sheet.getRange('B5').setValue('Email Alumne');
    sheet.getRange('A5:B5').setFontWeight('bold'); // Negrita para los encabezados

    // Escribir datos de los alumnos
    if (studentsData && studentsData.length > 0) {
      sheet.getRange(6, 1, studentsData.length, 2).setValues(studentsData);
    }

    // Aplicar formato
    sheet.autoResizeColumns(1, 2); // Ajustar automáticamente el ancho de las columnas A y B
    sheet.setFrozenRows(5); // Congelar la fila de encabezados de alumnos

    // Añadir bordes a la tabla de alumnos
    if (studentsData && studentsData.length > 0) {
      const lastRow = 5 + studentsData.length;
      sheet.getRange(5, 1, lastRow - 5 + 1, 2).setBorder(true, true, true, true, true, true);
    } else {
      // Si no hay alumnos, solo bordear el encabezado
      sheet.getRange(5, 1, 1, 2).setBorder(true, true, true, true, true, true);
    }

    const fileId = ss.getId();
    const originalOwnerEmail = 'secretaria@cfalapau.cat';

    // Transferir la propiedad al nuevo propietario
    Drive.Permissions.insert(
      {
        'role': 'owner',
        'type': 'user',
        'value': newOwnerEmail
      },
      fileId,
      {
        'sendNotificationEmails': true,
        'transferOwnership': true
      }
    );

    // --- INICIO DE MODIFICACIÓN: Eliminar permiso del propietario original si no es el nuevo propietario ---
    // console.log(`[GAS createStudentsSheet] Original Owner: ${originalOwnerEmail}, New Owner: ${newOwnerEmail}`); // LOG TEMPORAL
    if (originalOwnerEmail.toLowerCase() !== newOwnerEmail.toLowerCase()) {
      // console.log(`[GAS createStudentsSheet] Original owner is different from new owner. Attempting to remove permission.`); // LOG TEMPORAL
      const permissions = Drive.Permissions.list(fileId).items;
      // console.log(`[GAS createStudentsSheet] Permissions found: ${JSON.stringify(permissions)}`); // LOG TEMPORAL
      const originalOwnerPermission = permissions.find(p => p.emailAddress && p.emailAddress.toLowerCase() === originalOwnerEmail.toLowerCase());

      if (originalOwnerPermission) {
        // console.log(`[GAS createStudentsSheet] Found original owner's permission: ${JSON.stringify(originalOwnerPermission)}`); // LOG TEMPORAL
        Drive.Permissions.remove(fileId, originalOwnerPermission.id);
        // console.log(`[GAS createStudentsSheet] Attempted to remove original owner's permission.`); // LOG TEMPORAL
      } else {
        // console.log(`[GAS createStudentsSheet] Original owner's permission not found in list.`); // LOG TEMPORAL
      }
    } else {
      // console.log(`[GAS createStudentsSheet] Original owner is the same as new owner. Not removing permission.`); // LOG TEMPORAL
    }
    // --- FIN DE MODIFICACIÓN ---

    return { success: true, url: ss.getUrl(), message: `Full de càlcul creat i propietat transferida a ${newOwnerEmail}` };
  } catch (e) {
    return { success: false, message: `Error creant full de càlcul o transferint propietat: ${e.message}` };
  }
}

function actualitzarLlistes_disparador() {
  try {
    _sincronitzarClassrooms();
    _sincronitzarGroups();
    _sincronitzarChats();
    _aplicarValidacioDeDades();
  } catch (e) {
    MailApp.sendEmail(
      'el.teu.email@domini.com', 
      'Error en el script SincroAlumnes', 
      'Ha fallat el disparador "actualitzarLlistes_disparador" amb l\'error: \n\n' + e.stack
    );
  }
}

function actualitzarAlumnes_disparador() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    const studentsSheet = _getSheetAndClear(STUDENTS_SHEET_NAME);
    
    const configData = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, configSheet.getLastColumn()).getValues();
    const activeCourses = configData.filter(row => row[0] === true);

    if (activeCourses.length === 0) {
      return;
    }
    
    let allStudentsData = [];
    activeCourses.forEach(row => {
      const courseName = row[1];
      const courseId = row[5];
      
      let pageToken;
      do {
        const response = Classroom.Courses.Students.list(courseId, { pageSize: 100, pageToken: pageToken });
        if (response.students) {
          const studentData = response.students.map(s => {
            let email = s.profile.emailAddress;
            if (!email && s.userId) {
              try {
                const user = AdminDirectory.Users.get(s.userId);
                email = user.primaryEmail;
              } catch (e) {
                email = `Email no accessible (ID: ${s.userId})`;
              }
            }
            return [courseName, s.profile.name.fullName, email];
          });
          allStudentsData = allStudentsData.concat(studentData);
        }
        pageToken = response.nextPageToken;
      } while (pageToken);
    });

    if (allStudentsData.length > 0) {
      studentsSheet.getRange(2, 1, allStudentsData.length, 3).setValues(allStudentsData);
    }
  } catch (e) {
    MailApp.sendEmail(
      'el.teu.email@domini.com', 
      'Error en el script SincroAlumnes', 
      'Ha fallat el disparador "actualitzarAlumnes_disparador" amb l\'error: \n\n' + e.stack
    );
  }
}

function doOptions() {
  const response = ContentService.createTextOutput();
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;
  let result;

  try {
    switch (action) {
      case 'actualitzarLlistes':
        actualitzarLlistes();
        result = { success: true, message: 'Sincronització de llistes completada.' };
        break;
      case 'actualitzarAlumnes':
        actualitzarAlumnes();
        result = { success: true, message: 'Llista d\'alumnes actualitzada correctament.' };
        break;
      case 'actualitzarProfessors':
        actualitzarProfessors();
        result = { success: true, message: 'Llista de professors actualitzada correctament.' };
        break;
      case 'sincronitzarMembres':
        sincronitzarMembres();
        result = { success: true, message: 'Sincronització de membres i rols finalitzada.' };
        break;
      case 'iniciarSincronitzacioMembresAsync':
        // Deixar una senyal perquè el trigger executi la sincronització
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        ss.getRange(SIGNAL_CELL).setValue('START_SYNC_MEMBERS_' + new Date().toISOString());
        result = { success: true, message: 'Sincronització iniciada. Revisa l\'estat en uns minuts.' };
        break;
      case 'createStudentsSheet':
                  // console.log(`[GAS doGet] Received newOwnerEmail: ${e.parameter.newOwnerEmail}`); // AÑADE ESTA LÍNEA
                    result = createStudentsSheet(e.parameter.courseName, JSON.parse(e.parameter.studentsData), e.parameter.groupName, JSON.parse(e.parameter.teacherNames), e.parameter.newOwnerEmail);
        break;
      default:
        result = { success: false, message: 'Acció no vàlida.' };
    }
  } catch (error) {
    result = { success: false, message: `Error en l'execució de l'acció "${action}": ${error.message}` };
  }

  const jsonpOutput = ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);

  return jsonpOutput;
}

/**
 * Funció per a ser cridada per un trigger.
 * Comprova si hi ha una senyal per iniciar la sincronització de membres.
 * Si la troba, executa la sincronització i escriu el resultat.
 */
function comprovaISincronitzaMembres() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const signalCell = ss.getRange(SIGNAL_CELL);
  const resultCell = ss.getRange(RESULT_CELL);
  const signalValue = signalCell.getValue();
  
  if (signalValue && signalValue.toString().startsWith('START_SYNC_MEMBERS_')) {
    Logger.log('Senyal de sincronització trobada. Iniciant procés...');
    signalCell.clearContent(); // Netejar la senyal
    
    const startTime = new Date();
    try {
      sincronitzarMembres();
      const endTime = new Date();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      const successMessage = `Sincronització completada correctament a ${endTime.toLocaleString()} (Temps: ${duration}s).`;
      resultCell.setValue(successMessage);
      Logger.log(successMessage);
    } catch (error) {
      const endTime = new Date();
      const errorMessage = `Error en la sincronització: ${error.message} a ${endTime.toLocaleString()}.`;
      resultCell.setValue(errorMessage);
      Logger.log(errorMessage);
    }
  }
}

