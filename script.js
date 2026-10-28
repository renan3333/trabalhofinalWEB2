// ===== CONFIGURAÇÕES GLOBAIS =====
// Quando o front é servido pelo próprio Express (porta 3000 ou deploy), usa o mesmo domínio.
// Se for aberto via Live Server / file://, aponta para o back-end local.
const isStandaloneFront = location.protocol === 'file:' ||
    (['localhost', '127.0.0.1'].includes(location.hostname) && location.port !== '3000' && location.port !== '');
const API_URL = window.TOM_API_URL || (isStandaloneFront ? 'http://localhost:3000/api' : '/api');

const ROLE_HOME = { ALUNO: 'mainUser.html', PROFESSOR: 'mainProf.html', ADMIN: 'mainAdm.html' };
const PAGE_ROLES = {
    'mainUser.html': ['ALUNO'],
    'mainProf.html': ['PROFESSOR'],
    'mainAdm.html': ['ADMIN'],
    'gerenciamento.html': ['PROFESSOR', 'ADMIN']
};

// Chamada à API com JWT. Lança Error com a mensagem devolvida pelo servidor.
async function apiRequest(path, { method = 'GET', body } = {}) {
    const headers = {};
    const token = localStorage.getItem('authToken');
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    } catch {
        throw new Error('Não foi possível conectar ao servidor');
    }
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = data?.details?.[0]?.message;
        const err = new Error(detail || data?.error || 'Erro na requisição');
        err.status = res.status;
        throw err;
    }
    return data;
}

function clearSession() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
}

// ===== GERENCIAMENTO DE ESTADO =====
let currentUser = null;
let selectedTimeSlot = null;
let activeTab = 'aluno';

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Tom Music - Sistema Iniciado');
    
    // Verificar autenticação
    checkAuthentication();
    
    // Inicializar componentes
    initializeComponents();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Carregar dados iniciais
    loadInitialData();

    //Carrega estudantes ficticios somente na pagina feed
     if (window.location.pathname.includes('feed.html')) {
        loadStudents();
    }
});

// ===== AUTENTICAÇÃO =====
async function checkAuthentication() {
    const page = location.pathname.split('/').pop() || 'index.html';
    const allowedRoles = PAGE_ROLES[page];
    const token = localStorage.getItem('authToken');

    if (!token) {
        if (allowedRoles) location.href = 'login.html';
        return;
    }
    try {
        const { user } = await apiRequest('/auth/me');
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        if (allowedRoles && !allowedRoles.includes(user.role)) {
            location.href = ROLE_HOME[user.role] || 'login.html';
        }
    } catch (error) {
        if (error.status === 401) {
            clearSession();
            if (allowedRoles) location.href = 'login.html';
        }
    }
}



// ===== COMPONENTES =====
function initializeComponents() {
    // Menu Mobile
    const menuMobile = document.querySelector('.menu-mobile');
    if (menuMobile) {
        // Adiciona o ícone de barras se não existir
        if (!menuMobile.querySelector('i')) {
            menuMobile.innerHTML = '<i class="fas fa-bars"></i>';
        }
        menuMobile.addEventListener('click', toggleMobileMenu);
    }
    
    // Calendário
    if (document.getElementById('calendario-widget')) {
        initializeCalendar();
    }
    
    // Gráficos do Admin
    if (document.getElementById('instrumentChart')) {
        initializeAdminCharts();
    }
    
    // Carrossel de vídeos
    if (document.querySelector('.videos-carousel')) {
        initializeVideoCarousel();
    }
    
    // Notificações
    initializeNotifications();
}

//Função para fechar o menu ao clicar em um link
function setupMobileMenuClose() {
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                const menu = document.querySelector('nav ul');
                menu.classList.remove('active');
                
                const menuIcon = document.querySelector('.menu-mobile i');
                menuIcon.classList.remove('fa-times');
                menuIcon.classList.add('fa-bars');
            }
        });
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Menu Mobile
    setupMobileMenuClose();

    // Formulários
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', handleAgendamento);
    }
    
    const formAluno = document.getElementById('formAluno');
    if (formAluno) {
        formAluno.addEventListener('submit', handleNovoAluno);
    }
    
    // Time slots
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.addEventListener('click', selectTimeSlot);
    });
    
    // Filtros
    const filtroInstrumento = document.getElementById('filtro-instrumento');
    if (filtroInstrumento) {
        filtroInstrumento.addEventListener('change', filtrarAulas);
    }
    
    const filtroData = document.getElementById('filtro-data');
    if (filtroData) {
        filtroData.addEventListener('change', filtrarAulas);
    }
}

// ===== MENU MOBILE =====
function toggleMobileMenu() {
    const menu = document.querySelector('nav ul');
    menu.classList.toggle('active');
    
    const menuIcon = document.querySelector('.menu-mobile i');
    if (menuIcon.classList.contains('fa-bars')) {
        menuIcon.classList.remove('fa-bars');
        menuIcon.classList.add('fa-times');
    } else {
        menuIcon.classList.remove('fa-times');
        menuIcon.classList.add('fa-bars');
    }
}

// ===== LOGIN E AUTENTICAÇÃO =====
function switchTab(tab) {
    activeTab = tab;
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(t => t.classList.remove('active'));
    
    event.target.classList.add('active');
    
    const formTitle = document.getElementById('formTitle');
    const formSubtitle = document.getElementById('formSubtitle');
    
    switch(tab) {
        case 'aluno':
            formTitle.textContent = 'Login do Aluno';
            formSubtitle.textContent = 'Entre com suas credenciais para acessar sua conta';
            break;
        case 'professor':
            formTitle.textContent = 'Login do Professor';
            formSubtitle.textContent = 'Acesse sua área de ensino';
            break;
        case 'admin':
            formTitle.textContent = 'Login Administrativo';
            formSubtitle.textContent = 'Acesso restrito aos administradores';
            break;
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.querySelector('[name="remember"]').checked;

    try {
        showLoading();
        const { token, user } = await apiRequest('/auth/login', {
            method: 'POST',
            body: { email, password, userType: activeTab }
        });

        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
        if (remember) localStorage.setItem('rememberedEmail', email);

        // Redireciona de acordo com o perfil real retornado pelo servidor
        window.location.href = ROLE_HOME[user.role] || 'index.html';
    } catch (error) {
        showError(error.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
        hideLoading();
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(event.target));

    if (data.password !== data.confirmPassword) {
        showError('As senhas não coincidem');
        return;
    }

    try {
        showLoading();
        await apiRequest('/auth/register', {
            method: 'POST',
            body: {
                name: `${data.firstName} ${data.lastName}`.trim(),
                email: data.email,
                phone: data.phone || undefined,
                password: data.password
            }
        });
        showSuccess('Cadastro realizado com sucesso! Faça login para continuar.');
        setTimeout(showLoginForm, 2000);
    } catch (error) {
        showError(error.message || 'Erro ao realizar cadastro');
    } finally {
        hideLoading();
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showLoginForm() {
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = event.target.querySelector('input[type="email"]').value;
    
    showLoading();
    
    setTimeout(() => {
        hideLoading();
        showSuccess('Instruções enviadas para ' + email);
        closeForgotPassword();
    }, 2000);
}

function closeForgotPassword() {
    document.getElementById('forgotPasswordModal').style.display = 'none';
}

// ===== AGENDAMENTO =====
function abrirModalAgendamento() {
    document.getElementById('modalAgendamento').style.display = 'block';
    carregarHorariosDisponiveis();
}

function fecharModalAgendamento() {
    document.getElementById('modalAgendamento').style.display = 'none';
    resetarFormulario('formAgendamento');
}

function abrirModalAgendarAula() {
    document.getElementById('modalAgendarAula').style.display = 'block';
}

function fecharModalAgendarAula() {
    document.getElementById('modalAgendarAula').style.display = 'none';
}

async function handleAgendamento(event) {
    event.preventDefault();

    const body = {
        studentId: Number(document.getElementById('aluno').value),
        instrumentId: Number(document.getElementById('instrumento').value),
        date: document.getElementById('data').value,
        time: document.getElementById('horario').value
    };
    // Admin precisa informar o professor; professor usa a si mesmo (definido no servidor)
    if (currentUser?.role === 'ADMIN') {
        const teacherSelect = document.getElementById('professor');
        if (teacherSelect) body.teacherId = Number(teacherSelect.value);
    }

    try {
        showLoading();
        await apiRequest('/lessons', { method: 'POST', body });
        showSuccess('Aula agendada com sucesso!');
        fecharModalAgendamento();
        atualizarListaAulas();
    } catch (error) {
        showError(error.message || 'Erro ao agendar aula');
    } finally {
        hideLoading();
    }
}

function selectTimeSlot(event) {
    // Remover seleção anterior
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Adicionar seleção atual
    event.target.classList.add('selected');
    selectedTimeSlot = event.target.textContent;
}

async function carregarHorariosDisponiveis() {
    const data = document.getElementById('data').value;
    const professor = document.getElementById('aluno').value;
    
    if (data && professor) {
        // Carregar horários disponíveis via API
        // Por enquanto, apenas mostrar todos os horários
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.disabled = false;
        });
    }
}

// ===== GERENCIAMENTO DE ALUNOS =====
function abrirModalAluno() {
    document.getElementById('modalAluno').style.display = 'block';
}

function fecharModalAluno() {
    document.getElementById('modalAluno').style.display = 'none';
    resetarFormulario('formAluno');
}

async function handleNovoAluno(event) {
    event.preventDefault();

    // A tela não pede senha: geramos uma provisória e mostramos ao responsável.
    const tempPassword = 'tom' + Math.floor(100000 + Math.random() * 900000);

    try {
        showLoading();
        await apiRequest('/users', {
            method: 'POST',
            body: {
                name: document.getElementById('nomeAluno').value,
                email: document.getElementById('emailAluno').value,
                phone: document.getElementById('telefoneAluno').value,
                password: tempPassword,
                role: 'ALUNO'
            }
        });
        showSuccess(`Aluno cadastrado! Senha provisória: ${tempPassword}`);
        fecharModalAluno();
        atualizarTabelaAlunos();
    } catch (error) {
        showError(error.message || 'Erro ao cadastrar aluno');
    } finally {
        hideLoading();
    }
}

// ===== CALENDÁRIO =====
function initializeCalendar() {
    const calendarWidget = document.getElementById('calendario-widget');
    if (!calendarWidget) return;
    
    // Implementar calendário simples
    const currentDate = new Date();
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    
    const calendar = generateCalendarHTML(month, year);
    calendarWidget.innerHTML = calendar;
    
    // Adicionar event listeners para os dias
    calendarWidget.querySelectorAll('.calendar-day').forEach(day => {
        day.addEventListener('click', selecionarDia);
    });
}

function generateCalendarHTML(month, year) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    let html = `
        <div class="calendar-header">
            <button onclick="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
            <h3>${monthNames[month]} ${year}</h3>
            <button onclick="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="calendar-grid">
            <div class="calendar-day-header">Dom</div>
            <div class="calendar-day-header">Seg</div>
            <div class="calendar-day-header">Ter</div>
            <div class="calendar-day-header">Qua</div>
            <div class="calendar-day-header">Qui</div>
            <div class="calendar-day-header">Sex</div>
            <div class="calendar-day-header">Sáb</div>
    `;
    
    // Adicionar dias vazios no início
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Adicionar dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
        const hasClass = Math.random() > 0.7; // Simulação de aulas marcadas
        html += `<div class="calendar-day ${hasClass ? 'has-class' : ''}" data-day="${day}">${day}</div>`;
    }
    
    html += '</div>';
    
    return html;
}

function changeMonth(direction) {
    // Implementar mudança de mês
    console.log('Mudar mês:', direction);
}

function selecionarDia(event) {
    const day = event.target.dataset.day;
    if (day) {
        // Carregar aulas do dia selecionado
        console.log('Dia selecionado:', day);
    }
}

// ===== FILTROS =====
function filtrarAulas() {
    const instrumento = document.getElementById('filtro-instrumento').value;
    const data = document.getElementById('filtro-data').value;
    
    // Implementar lógica de filtro
    console.log('Filtrar por:', instrumento, data);
    
    // Atualizar lista de aulas
    atualizarListaAulas();
}

function filtrarPacotes(instrumento) {
    const pacotes = document.querySelectorAll('[data-instrumento]');
    
    pacotes.forEach(pacote => {
        if (instrumento === 'todos' || pacote.dataset.instrumento === instrumento || pacote.dataset.instrumento === 'todos') {
            pacote.style.display = 'block';
        } else {
            pacote.style.display = 'none';
        }
    });
    
    // Atualizar botões de filtro
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// ===== GRÁFICOS ADMIN =====
function initializeAdminCharts() {
    // Gráfico de Instrumentos
    const instrumentCtx = document.getElementById('instrumentChart');
    if (instrumentCtx) {
        new Chart(instrumentCtx, {
            type: 'doughnut',
            data: {
                labels: ['Violão', 'Guitarra', 'Piano', 'Bateria', 'Baixo'],
                datasets: [{
                    data: [45, 25, 20, 15, 10],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Gráfico de Crescimento
    const growthCtx = document.getElementById('growthChart');
    if (growthCtx) {
        new Chart(growthCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
                datasets: [{
                    label: 'Novos Alunos',
                    data: [12, 19, 15, 25, 22, 30],
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// ===== CARROSSEL DE VÍDEOS =====
function initializeVideoCarousel() {
    // Implementar carrossel simples
    let currentSlide = 0;
    const slides = document.querySelectorAll('.video-slide');
    
    if (slides.length === 0) return;
    
    // Criar botões de navegação
    const carousel = document.querySelector('.videos-carousel');
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-btn prev';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = () => changeSlide(-1);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-btn next';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = () => changeSlide(1);
    
    carousel.appendChild(prevBtn);
    carousel.appendChild(nextBtn);
    
    function changeSlide(direction) {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + direction + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
    }
    
    // Mostrar primeiro slide
    slides[0].classList.add('active');
}

// ===== NOTIFICAÇÕES =====
function initializeNotifications() {
    // Verificar se há notificações pendentes
    checkPendingNotifications();
    
    // Configurar verificação periódica
    setInterval(checkPendingNotifications, 60000); // A cada minuto
}

function checkPendingNotifications() {
    // Simular verificação de notificações
    const hasUpcomingClass = Math.random() > 0.8;
    
    if (hasUpcomingClass && Notification.permission === 'granted') {
        showNotification('Lembrete de Aula', 'Sua aula de música começa em 30 minutos!');
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'images/logo11.png',
            badge: 'images/logo11.png'
        });
    }
}

// ===== FAQ =====
function toggleFaq(button) {
    const faqItem = button.parentElement;
    const answer = faqItem.querySelector('.faq-answer');
    const icon = button.querySelector('i');
    
    // Fechar outras FAQs abertas
    document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
            item.querySelector('.faq-answer').style.maxHeight = null;
            item.querySelector('i').classList.remove('fa-chevron-up');
            item.querySelector('i').classList.add('fa-chevron-down');
        }
    });
    
    // Toggle FAQ atual
    faqItem.classList.toggle('active');
    
    if (faqItem.classList.contains('active')) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        answer.style.maxHeight = null;
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// ===== SIDEBAR ADMIN =====
function toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const mainContent = document.querySelector('.admin-main');
    
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

// ===== CHAT =====
function abrirChat() {
    // Implementar abertura de chat
    console.log('Abrir chat de suporte');
    
    // Por enquanto, mostrar mensagem
    showInfo('Chat em desenvolvimento. Entre em contato pelo WhatsApp: (11) 91234-5678');
}

// ===== UTILITÁRIOS =====
function showLoading() {
    // Criar overlay de loading se não existir
    let loadingOverlay = document.getElementById('loadingOverlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Carregando...</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showError(message) {
    showToast(message, 'error');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showInfo(message) {
    showToast(message, 'info');
}

function showToast(message, type = 'info') {
    // Criar container de toasts se não existir
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Criar toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remover após 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function resetarFormulario(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        selectedTimeSlot = null;
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
    }
}

function atualizarListaAulas() {
    // Implementar atualização da lista de aulas
    console.log('Atualizar lista de aulas');
}

function atualizarTabelaAlunos() {
    // Implementar atualização da tabela de alunos
    console.log('Atualizar tabela de alunos');
}



// ===== DADOS INICIAIS =====
function loadInitialData() {
    // Carregar dados salvos localmente
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail && document.getElementById('email')) {
        document.getElementById('email').value = rememberedEmail;
    }
    
    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ===== AGENDAMENTO DO ALUNO (mainUser.html) =====
async function initStudentScheduling() {
    const form = document.getElementById('formAgendarAula');
    if (!form) return;

    const instrumentSelect = document.getElementById('tipoAula');
    const teacherSelect = document.getElementById('professor');
    const dateInput = document.getElementById('dataAula');
    const slotsBox = document.querySelector('#modalAgendarAula .time-slots');

    // Instrumentos e professores vêm do banco de dados
    try {
        const [instruments, teachers] = await Promise.all([
            apiRequest('/instruments'),
            apiRequest('/users/teachers')
        ]);
        instrumentSelect.innerHTML = '<option value="">Selecione</option>' +
            instruments.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        teacherSelect.innerHTML = '<option value="">Selecione o professor</option>' +
            teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    } catch (error) {
        showError(error.message);
        return;
    }

    dateInput.min = new Date().toISOString().slice(0, 10);

    async function refreshSlots() {
        selectedTimeSlot = null;
        if (!teacherSelect.value || !dateInput.value) return;
        try {
            const slots = await apiRequest(
                `/lessons/availability?teacherId=${teacherSelect.value}&date=${dateInput.value}`
            );
            slotsBox.innerHTML = slots.map(s =>
                `<button type="button" class="time-slot" ${s.available ? '' : 'disabled'}>${s.time}</button>`
            ).join('');
            slotsBox.querySelectorAll('.time-slot').forEach(b => b.addEventListener('click', selectTimeSlot));
        } catch (error) {
            showError(error.message);
        }
    }
    teacherSelect.addEventListener('change', refreshSlots);
    dateInput.addEventListener('change', refreshSlots);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!selectedTimeSlot) {
            showError('Por favor, selecione um horário');
            return;
        }
        try {
            showLoading();
            await apiRequest('/lessons', {
                method: 'POST',
                body: {
                    instrumentId: Number(instrumentSelect.value),
                    teacherId: Number(teacherSelect.value),
                    date: dateInput.value,
                    time: selectedTimeSlot
                }
            });
            showSuccess('Aula agendada com sucesso!');
            fecharModalAgendarAula();
            form.reset();
            refreshSlots();
        } catch (error) {
            showError(error.message || 'Erro ao agendar aula');
        } finally {
            hideLoading();
        }
    });
}
document.addEventListener('DOMContentLoaded', initStudentScheduling);

// ===== AGENDAMENTO PELO PROFESSOR/ADMIN (gerenciamento.html) =====
async function initManagementScheduling() {
    const form = document.getElementById('formAgendamento');
    if (!form) return;
    const me = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const studentSelect = document.getElementById('aluno');
    const instrumentSelect = document.getElementById('instrumento');

    try {
        const [students, instruments] = await Promise.all([
            apiRequest('/users?role=ALUNO'),
            apiRequest('/instruments')
        ]);
        studentSelect.innerHTML = '<option value="">Selecione um aluno</option>' +
            students.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        instrumentSelect.innerHTML = '<option value="">Selecione um instrumento</option>' +
            instruments.map(i => `<option value="${i.id}">${i.name}</option>`).join('');

        // Admin escolhe também o professor
        if (me.role === 'ADMIN' && !document.getElementById('professor')) {
            const teachers = await apiRequest('/users/teachers');
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = '<label for="professor">Professor:</label>' +
                '<select id="professor" required><option value="">Selecione um professor</option>' +
                teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('') + '</select>';
            studentSelect.closest('.form-group').before(group);
        }
    } catch (error) {
        showError(error.message);
    }
}
document.addEventListener('DOMContentLoaded', initManagementScheduling);

// Botões "Sair" das áreas logadas encerram a sessão
document.addEventListener('click', (event) => {
    const logout = event.target.closest('.logout-btn, .btn-logout, a[href="index.html"]');
    const page = location.pathname.split('/').pop();
    if (logout && PAGE_ROLES[page]) clearSession();
});

// ===== EXPORTAR FUNÇÕES GLOBAIS =====
window.toggleMobileMenu = toggleMobileMenu;
window.switchTab = switchTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.togglePassword = togglePassword;
window.showRegisterForm = showRegisterForm;
window.showLoginForm = showLoginForm;
window.handleForgotPassword = handleForgotPassword;
window.closeForgotPassword = closeForgotPassword;
window.abrirModalAgendamento = abrirModalAgendamento;
window.fecharModalAgendamento = fecharModalAgendamento;
window.abrirModalAgendarAula = abrirModalAgendarAula;
window.fecharModalAgendarAula = fecharModalAgendarAula;
window.abrirModalAluno = abrirModalAluno;
window.fecharModalAluno = fecharModalAluno;
window.changeMonth = changeMonth;
window.filtrarPacotes = filtrarPacotes;
window.toggleFaq = toggleFaq;
window.toggleSidebar = toggleSidebar;
window.abrirChat = abrirChat;

//Funcoes da API

function loadStudents() {
    // Elemento onde os alunos serão exibidos
    const studentsContainer = document.createElement('div');
    studentsContainer.className = 'students-container';
    document.querySelector('h1').after(studentsContainer);

    // Adiciona um loading enquanto os dados são carregados
    studentsContainer.innerHTML = '<p class="loading">Carregando alunos...</p>';

    // Busca os dados na API
    fetch('https://jsonplaceholder.typicode.com/users')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar dados');
            }
            return response.json();
        })
        .then(users => {
            // Limpa o loading
            studentsContainer.innerHTML = '';

            // Limita para 6 alunos (opcional)
            const students = users.slice(0, 6);

            // Cria os cards para cada aluno
            students.forEach(student => {
                const studentCard = document.createElement('div');
                studentCard.className = 'student-card';

                // Cria um instrumento musical aleatório para cada aluno
                const instruments = ['Violão', 'Piano', 'Bateria', 'Violino', 'Canto', 'Guitarra'];
                const randomInstrument = instruments[Math.floor(Math.random() * instruments.length)];

                studentCard.innerHTML = `
                    <div class="student-avatar">
                        <img src="https://i.pravatar.cc/150?u=${student.id}" alt="${student.name}">
                    </div>
                    <div class="student-info">
                        <h3>${student.name}</h3>
                        <p><strong>Instrumento:</strong> ${randomInstrument}</p>
                        <p><strong>Cidade:</strong> ${student.address.city}</p>
                        <p><strong>Email:</strong> ${student.email}</p>
                    </div>
                `;

                studentsContainer.appendChild(studentCard);
            });
        })
        .catch(error => {
            console.error('Erro:', error);
            studentsContainer.innerHTML = '<p class="error">Não foi possível carregar os alunos no momento.</p>';
        });
}