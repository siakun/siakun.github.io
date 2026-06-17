export interface SocialLink {
  label: string;
  url: string;
}

export interface Profile {
  avatar: string;
  name: string;
  title: string;
  subtitle: string;
  email: string;
  location: string;
  links: SocialLink[];
}

export const profile: Profile = {
  avatar: 'https://avatars.githubusercontent.com/u/18740181',
  name: 'Soung-Gyu Jin',
  title: 'Software Engineer',
  subtitle: '효율적이고 유지보수 가능한 코드를 지향하는 개발자',
  email: 'lunasia819@gmail.com',
  location: 'Seoul, South Korea',
  links: [
    { label: 'GitHub', url: 'https://github.com/siakun' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/soung-gyu-jin/' },
  ],
};
