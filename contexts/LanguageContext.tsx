import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'vi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Layout
    'app.title': 'BayesEvolve',
    'app.subtitle': 'Interactive History of Bayesian Computation',
    'nav.home': 'History Timeline',
    'nav.analytical': '1. Analytical Era',
    'nav.metropolis': '2. Simulation (MH)',
    'nav.gibbs': '3. Component-Wise (Gibbs)',
    'nav.hmc': '4. Geometric Era (HMC)',
    'nav.variational': '5. Scalable Era (VI)',
    'achievements': 'Achievements',
    'footer': 'Inspired by Prof Kerrie Mengersen\'s lectures in Hanoi (2025), developed by Nam-Anh Le (an average undergrad @ NEU)',
    
    // Common
    'the_problem': 'The Problem',
    'the_solution': 'The Solution',
    'in_simple_terms': 'In Simple Terms',
    'key_equations': 'Key Equations',
    'key_insight': 'Key Insight',
    'controls': 'Controls',
    'reset': 'Reset',
    'try_demo': 'Try Interactive Demo',
    
    // ModuleMetropolis
    'mh.title': 'The Simulation Revolution: Metropolis-Hastings',
    'mh.problem': 'When the posterior cannot be normalized:',
    'mh.problem_detail': 'is intractable, we cannot sample directly.',
    'mh.solution': 'M-H constructs a Markov chain with stationary distribution',
    'mh.solution_detail': 'using only the unnormalized posterior. Key insight: we only need ratios.',
    'mh.eli5': 'Imagine you\'re blindfolded on a mountain. You can feel if a step goes up or down. Always walk uphill; sometimes walk downhill (to escape local bumps). Eventually you\'ll spend most time near the peak—mapping it without ever seeing the whole mountain.',
    'mh.accept_rate': 'Accept rate',
    'mh.samples': 'Samples',
    'mh.goal': 'goal',
    'mh.fog_hint': 'Fog clears as you explore. Mountains = high probability regions.',
    'mh.manual_mode': 'Manual Mode',
    'mh.auto_mode': 'Auto Mode',
    'mh.propose': 'Propose',
    'mh.accept_reject': 'Accept/Reject',
    'mh.uphill': 'UPHILL: Always accepted',
    'mh.downhill': 'DOWNHILL: Accept with prob α',
    'mh.reset_sampler': 'Reset Sampler',
    
    // ModuleGibbs
    'gibbs.title': 'The Component-Wise Era: Gibbs Sampling',
    'gibbs.problem': 'In d dimensions, M-H proposals have probability:',
    'gibbs.problem_detail': 'Most proposals rejected.',
    'gibbs.solution': 'Gibbs decomposes d-dimensional sampling into d one-dimensional problems by sampling each component from its',
    'gibbs.conditional': 'conditional distribution',
    'gibbs.eli5': 'Like an Etch-a-Sketch—you can only move horizontally OR vertically, never diagonally. To get anywhere, alternate: right, up, right, up. Each single-direction move is easy; together they explore the whole space.',
    'gibbs.correlation': 'Correlation',
    'gibbs.try_hint': 'Try increasing ρ to 0.99. See how the sampler gets stuck? It\'s forced to take tiny steps because the probability contours are too elongated.',
    'gibbs.fixed': 'fixed',
    'gibbs.sample': 'Sample',
    'gibbs.take_step': 'Take Step: Sample',
    'gibbs.reset_sampler': 'Reset Sampler',
    
    // ModuleHMC
    'hmc.title': 'The Geometric Era: Hamiltonian Monte Carlo',
    'hmc.problem': 'Random walks require',
    'hmc.problem_detail': 'steps to traverse distance d. With correlation',
    'hmc.problem_detail2': 'Gibbs needs:',
    'hmc.solution': 'HMC treats sampling as physics. Define potential energy and simulate Hamilton\'s equations:',
    'hmc.eli5': 'You\'re a skateboarder in a bowl (the probability landscape, flipped). Instead of randomly walking, you push off and let physics carry you along curved edges. You naturally glide to low-energy spots (= high probability) covering huge distances efficiently.',
    'hmc.click_set': 'Click on the canvas to set particle position',
    'hmc.leapfrog_steps': 'Leapfrog Steps',
    'hmc.step_size': 'Step Size',
    'hmc.launch': 'Launch HMC',
    'hmc.new_momentum': 'New Momentum',
    
    // ModuleVariational
    'vi.title': 'The Scalable Era: Variational Inference',
    'vi.problem': 'MCMC is exact but slow. For Big Data with',
    'vi.problem_detail': 'even HMC becomes impractical:',
    'vi.solution': 'VI transforms sampling → optimization. Find',
    'vi.solution_detail': 'that best approximates',
    'vi.solution_detail2': 'by maximizing the ELBO:',
    'vi.eli5': 'Instead of wandering the mountain to map it (MCMC), you take a stretchy fabric and pull it tight to fit the terrain as closely as possible. The fabric isn\'t perfect—it misses some details—but you get the overall shape in seconds instead of hours. VI is "find the closest matching shape" instead of "walk every step."',
    'vi.distribution_fitting': 'Distribution Fitting',
    'vi.true_posterior': 'True posterior',
    'vi.approximation': 'Approximation',
    'vi.mean': 'Mean',
    'vi.std_dev': 'Std Dev',
    'vi.optimization_metrics': 'Optimization Metrics',
    'vi.higher_better': 'Higher is better (maximize)',
    'vi.lower_better': 'Lower is better (minimize)',
    'vi.iterations': 'Iterations',
    'vi.run_gradient': 'Run Gradient Ascent',
    'vi.pause': 'Pause Optimization',
    'vi.try_hint': 'Try this:',
    'vi.hint1': 'Drag sliders to manually fit q(θ)',
    'vi.hint2': 'Watch ELBO change as you adjust',
    'vi.hint3': 'Click "Run Gradient Ascent" to auto-optimize',
    'vi.hint4': 'Notice: single Gaussian can\'t capture bimodal posterior!',
    
    // Home Timeline
    'home.title': 'History of Bayesian Computation',
    'home.subtitle': 'From closed-form solutions to modern probabilistic programming',
    'home.click_expand': 'Click any era to explore its story',
    
    // Era titles
    'era.analytical.title': 'The Analytical Era',
    'era.analytical.period': '1763 - 1950s',
    'era.analytical.subtitle': 'Conjugate Priors & Closed-Form Solutions',
    
    'era.simulation.title': 'The Simulation Revolution',
    'era.simulation.period': '1953 - 1980s',
    'era.simulation.subtitle': 'Monte Carlo & Metropolis-Hastings',
    
    'era.componentwise.title': 'The Component-Wise Era',
    'era.componentwise.period': '1984 - 1990s',
    'era.componentwise.subtitle': 'Gibbs Sampling & Conditional Distributions',
    
    'era.geometric.title': 'The Geometric Era',
    'era.geometric.period': '1987 - Present',
    'era.geometric.subtitle': 'Hamiltonian Monte Carlo & Differential Geometry',
    
    'era.scalable.title': 'The Scalable & Variational Era',
    'era.scalable.period': '1999 - Present',
    'era.scalable.subtitle': 'Variational Inference & Probabilistic Programming',
  },
  vi: {
    // Layout
    'app.title': 'BayesEvolve',
    'app.subtitle': 'Lịch sử Tính toán Bayes Tương tác',
    'nav.home': 'Dòng thời gian',
    'nav.analytical': '1. Kỷ nguyên Giải tích',
    'nav.metropolis': '2. Mô phỏng (MH)',
    'nav.gibbs': '3. Từng thành phần (Gibbs)',
    'nav.hmc': '4. Hình học (HMC)',
    'nav.variational': '5. Mở rộng (VI)',
    'achievements': 'Thành tựu',
    'footer': 'Lấy cảm hứng từ bài giảng của GS Kerrie Mengersen tại Hà Nội (2025), phát triển bởi Lê Nam Anh (sinh viên NEU)',
    
    // Common
    'the_problem': 'Vấn đề',
    'the_solution': 'Giải pháp',
    'in_simple_terms': 'Giải thích đơn giản',
    'key_equations': 'Công thức chính',
    'key_insight': 'Ý tưởng cốt lõi',
    'controls': 'Điều khiển',
    'reset': 'Đặt lại',
    'try_demo': 'Thử Demo Tương tác',
    
    // ModuleMetropolis
    'mh.title': 'Cuộc cách mạng Mô phỏng: Metropolis-Hastings',
    'mh.problem': 'Khi phân phối hậu nghiệm không thể chuẩn hóa:',
    'mh.problem_detail': 'không tính được, ta không thể lấy mẫu trực tiếp.',
    'mh.solution': 'M-H xây dựng chuỗi Markov với phân phối dừng',
    'mh.solution_detail': 'chỉ dùng hậu nghiệm chưa chuẩn hóa. Ý tưởng then chốt: chỉ cần tỉ số.',
    'mh.eli5': 'Tưởng tượng bạn bị bịt mắt trên một ngọn núi. Bạn có thể cảm nhận bước đi lên hay xuống. Luôn đi lên; đôi khi đi xuống (để thoát khỏi các ụ nhỏ). Cuối cùng bạn sẽ dành phần lớn thời gian gần đỉnh—vẽ bản đồ mà không cần nhìn toàn bộ ngọn núi.',
    'mh.accept_rate': 'Tỉ lệ chấp nhận',
    'mh.samples': 'Mẫu',
    'mh.goal': 'mục tiêu',
    'mh.fog_hint': 'Sương tan khi bạn khám phá. Núi = vùng xác suất cao.',
    'mh.manual_mode': 'Chế độ Thủ công',
    'mh.auto_mode': 'Chế độ Tự động',
    'mh.propose': 'Đề xuất',
    'mh.accept_reject': 'Chấp nhận/Từ chối',
    'mh.uphill': 'LÊN DỐC: Luôn chấp nhận',
    'mh.downhill': 'XUỐNG DỐC: Chấp nhận với xác suất α',
    'mh.reset_sampler': 'Đặt lại Bộ lấy mẫu',
    
    // ModuleGibbs
    'gibbs.title': 'Kỷ nguyên Từng thành phần: Gibbs Sampling',
    'gibbs.problem': 'Trong d chiều, đề xuất M-H có xác suất:',
    'gibbs.problem_detail': 'Hầu hết đề xuất bị từ chối.',
    'gibbs.solution': 'Gibbs phân tách bài toán d chiều thành d bài toán một chiều bằng cách lấy mẫu từng thành phần từ',
    'gibbs.conditional': 'phân phối có điều kiện',
    'gibbs.eli5': 'Giống như Etch-a-Sketch—bạn chỉ có thể di chuyển ngang HOẶC dọc, không bao giờ chéo. Để đi đâu đó, xen kẽ: phải, lên, phải, lên. Mỗi bước một hướng thì dễ; cùng nhau chúng khám phá toàn bộ không gian.',
    'gibbs.correlation': 'Tương quan',
    'gibbs.try_hint': 'Thử tăng ρ lên 0.99. Thấy bộ lấy mẫu bị kẹt không? Nó buộc phải bước nhỏ vì đường đồng mức xác suất quá kéo dài.',
    'gibbs.fixed': 'cố định',
    'gibbs.sample': 'Lấy mẫu',
    'gibbs.take_step': 'Bước tiếp: Lấy mẫu',
    'gibbs.reset_sampler': 'Đặt lại Bộ lấy mẫu',
    
    // ModuleHMC
    'hmc.title': 'Kỷ nguyên Hình học: Hamiltonian Monte Carlo',
    'hmc.problem': 'Bước ngẫu nhiên cần',
    'hmc.problem_detail': 'bước để đi quãng d. Với tương quan',
    'hmc.problem_detail2': 'Gibbs cần:',
    'hmc.solution': 'HMC coi lấy mẫu như vật lý. Định nghĩa năng lượng thế năng và mô phỏng phương trình Hamilton:',
    'hmc.eli5': 'Bạn là người trượt ván trong một cái bát (địa hình xác suất, lật ngược). Thay vì đi bộ ngẫu nhiên, bạn đẩy và để vật lý đưa bạn theo các cạnh cong. Bạn tự nhiên trượt đến điểm năng lượng thấp (= xác suất cao) với quãng đường lớn hiệu quả.',
    'hmc.click_set': 'Click vào canvas để đặt vị trí hạt',
    'hmc.leapfrog_steps': 'Số bước Leapfrog',
    'hmc.step_size': 'Kích thước bước',
    'hmc.launch': 'Khởi động HMC',
    'hmc.new_momentum': 'Động lượng mới',
    
    // ModuleVariational
    'vi.title': 'Kỷ nguyên Mở rộng: Suy diễn Biến phân',
    'vi.problem': 'MCMC chính xác nhưng chậm. Với Big Data có',
    'vi.problem_detail': 'ngay cả HMC cũng không thực tế:',
    'vi.solution': 'VI chuyển lấy mẫu → tối ưu hóa. Tìm',
    'vi.solution_detail': 'xấp xỉ tốt nhất',
    'vi.solution_detail2': 'bằng cách tối đa ELBO:',
    'vi.eli5': 'Thay vì đi khắp núi để vẽ bản đồ (MCMC), bạn lấy một tấm vải co giãn và kéo căng để ôm sát địa hình. Tấm vải không hoàn hảo—bỏ lỡ một số chi tiết—nhưng bạn có hình dạng tổng thể trong vài giây thay vì vài giờ. VI là "tìm hình gần nhất" thay vì "đi từng bước".',
    'vi.distribution_fitting': 'Khớp Phân phối',
    'vi.true_posterior': 'Hậu nghiệm thực',
    'vi.approximation': 'Xấp xỉ',
    'vi.mean': 'Trung bình',
    'vi.std_dev': 'Độ lệch chuẩn',
    'vi.optimization_metrics': 'Chỉ số Tối ưu',
    'vi.higher_better': 'Cao hơn là tốt hơn (tối đa)',
    'vi.lower_better': 'Thấp hơn là tốt hơn (tối thiểu)',
    'vi.iterations': 'Số vòng lặp',
    'vi.run_gradient': 'Chạy Gradient Ascent',
    'vi.pause': 'Tạm dừng Tối ưu',
    'vi.try_hint': 'Thử này:',
    'vi.hint1': 'Kéo thanh trượt để khớp q(θ) thủ công',
    'vi.hint2': 'Xem ELBO thay đổi khi điều chỉnh',
    'vi.hint3': 'Click "Chạy Gradient Ascent" để tự động tối ưu',
    'vi.hint4': 'Lưu ý: Gaussian đơn không thể bắt được hậu nghiệm hai đỉnh!',
    
    // Home Timeline
    'home.title': 'Lịch sử Tính toán Bayes',
    'home.subtitle': 'Từ nghiệm dạng đóng đến lập trình xác suất hiện đại',
    'home.click_expand': 'Click vào bất kỳ kỷ nguyên nào để khám phá',
    
    // Era titles
    'era.analytical.title': 'Kỷ nguyên Giải tích',
    'era.analytical.period': '1763 - 1950s',
    'era.analytical.subtitle': 'Prior Liên hợp & Nghiệm Dạng đóng',
    
    'era.simulation.title': 'Cuộc cách mạng Mô phỏng',
    'era.simulation.period': '1953 - 1980s',
    'era.simulation.subtitle': 'Monte Carlo & Metropolis-Hastings',
    
    'era.componentwise.title': 'Kỷ nguyên Từng thành phần',
    'era.componentwise.period': '1984 - 1990s',
    'era.componentwise.subtitle': 'Gibbs Sampling & Phân phối Có điều kiện',
    
    'era.geometric.title': 'Kỷ nguyên Hình học',
    'era.geometric.period': '1987 - Hiện tại',
    'era.geometric.subtitle': 'Hamiltonian Monte Carlo & Hình học Vi phân',
    
    'era.scalable.title': 'Kỷ nguyên Mở rộng & Biến phân',
    'era.scalable.period': '1999 - Hiện tại',
    'era.scalable.subtitle': 'Suy diễn Biến phân & Lập trình Xác suất',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
