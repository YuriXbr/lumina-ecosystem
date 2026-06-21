import HomeNavBar from '../components/homeNavBar/HomeNavBar';

const TermsOfUsePage = () => {
  return (
    <div className="bg-whit min-h-screen">
      <HomeNavBar />
      <div className="container mx-auto px-6 py-24 sm:py-32 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-90 mb-8">Termos de Serviço</h1>
        <div className="prose dark:prose-dark">
          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao usar o Lumina, você concorda em cumprir e estar vinculado a estes Termos de Serviço. Se você não concorda com estes termos, por favor, não use o bot.
          </p>
          <h2>2. Descrição do Serviço</h2>
          <p>
            Lumina é um bot do Discord que fornece várias funcionalidades relacionadas ao League of Legends, incluindo histórico de partidas e estatísticas.
          </p>
          <h2>3. Conduta do Usuário</h2>
          <p>
            Você concorda em usar o Lumina apenas para fins legais. Você está proibido de usar o bot para violar quaisquer leis, regulamentos ou direitos de terceiros.
          </p>
          <h2>4. Coleta de Dados</h2>
          <p>
            Lumina coleta dados da API da Riot Games e interações no Discord para fornecer seus serviços. Ao usar o Lumina, você consente com essa coleta de dados.
          </p>
          <h2>5. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo fornecido pelo Lumina, incluindo, mas não se limitando a texto, gráficos e código, é propriedade do desenvolvedor e é protegido por leis de propriedade intelectual.
          </p>
          <h2>6. Limitação de Responsabilidade</h2>
          <p>
            Lumina é fornecido &quot;como está&quot; sem quaisquer garantias. O desenvolvedor não é responsável por quaisquer danos decorrentes do uso ou incapacidade de usar o bot.
          </p>
          <h2>7. Alterações nos Termos</h2>
          <p>
            O desenvolvedor reserva-se o direito de modificar estes termos a qualquer momento. As alterações serão publicadas, e o uso contínuo do Lumina constitui aceitação dos novos termos.
          </p>
          <h2>8. Lei Aplicável</h2>
          <p>
            Estes termos são regidos pelas leis do Brasil. Quaisquer disputas serão resolvidas nos tribunais do Brasil.
          </p>
        </div>
        <h1 className="text-4xl font-bold text-gray-90 mb-8 mt-16">Política de Privacidade</h1>
        <div className="prose dark:prose-dark">
          <h2>1. Coleta de Informações</h2>
          <p>
            Lumina coleta as seguintes informações:
          </p>
          <ul>
            <li>IDs de usuários do Discord e mensagens para fins de interação.</li>
            <li>Dados do League of Legends da API da Riot Games.</li>
          </ul>
          <h2>2. Uso das Informações</h2>
          <p>
            As informações coletadas são usadas para:
          </p>
          <ul>
            <li>Fornecer e melhorar os serviços do Lumina.</li>
            <li>Gerar histórico de partidas e estatísticas.</li>
          </ul>
          <h2>3. Compartilhamento de Dados</h2>
          <p>
            Lumina não compartilha seus dados pessoais com terceiros, exceto conforme exigido por lei ou para proteger os direitos e a segurança do desenvolvedor e dos usuários.
          </p>
          <h2>4. Segurança dos Dados</h2>
          <p>
            O desenvolvedor toma medidas razoáveis para proteger seus dados contra acesso, alteração ou destruição não autorizados.
          </p>
          <h2>5. Direitos dos Usuários</h2>
          <p>
            Você tem o direito de:
          </p>
          <ul>
            <li>Acessar os dados que o Lumina coletou sobre você.</li>
            <li>Solicitar a exclusão de seus dados.</li>
            <li>Retirar o consentimento para a coleta de dados.</li>
          </ul>
          <h2>6. Alterações na Política de Privacidade</h2>
          <p>
            O desenvolvedor reserva-se o direito de modificar esta política de privacidade a qualquer momento. As alterações serão publicadas, e o uso contínuo do Lumina constitui aceitação da nova política.
          </p>
          <h2>7. Informações de Contato</h2>
          <p>
            Para quaisquer perguntas ou preocupações sobre estes termos ou a política de privacidade, entre em contato com o desenvolvedor.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;