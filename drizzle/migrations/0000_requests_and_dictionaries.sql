CREATE TABLE public.repair_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  street text NOT NULL DEFAULT '',
  house text NOT NULL DEFAULT '',
  entrance text NOT NULL DEFAULT '',
  floor text NOT NULL DEFAULT '',
  apartment text NOT NULL DEFAULT '',
  applicant text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'В обработке',
  completed_at timestamptz,
  result text NOT NULL DEFAULT ''
);
GRANT ALL ON public.repair_requests TO service_role;
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_dictionaries (
  key text PRIMARY KEY,
  values text[] NOT NULL DEFAULT '{}',
  default_value text
);
GRANT ALL ON public.app_dictionaries TO service_role;
ALTER TABLE public.app_dictionaries ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_dictionaries (key, values) VALUES
 ('street', ARRAY['Институтская','Юбилейная','Школьная','Мира','Спортивная']),
 ('house', '{}'), ('entrance', '{}'), ('floor', '{}');

INSERT INTO public.repair_requests (street, house, entrance, floor, apartment, applicant, phone, description, created_at, created_by, status, completed_at, result) VALUES
 ('Школьная','12','2','3','27','Иванова Мария','+7 (912) 345-67-89','Не работает свет в коридоре, при включении выбивает автомат.', now() - interval '26 hours','user','Выполнено', now() - interval '20 hours','Заменён автомат 16А в щитке, устранено короткое замыкание в распаечной коробке.'),
 ('Мира','4','1','1','3','Петров Сергей','+7 (923) 111-22-33','Искрит розетка на кухне, чувствуется запах гари.', now() - interval '5 hours','user','В обработке', NULL, '');