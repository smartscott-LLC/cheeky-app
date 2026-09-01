Story beat sql

CREATE TABLE story\_beat\_completion (  
  id BIGSERIAL PRIMARY KEY,  
  user\_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,  
  beat\_number INT NOT NULL,             \-- 1–5  
  completed\_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  
  choice\_made TEXT,                      \-- the choice the user picked at this beat  
  score\_earned INT                       \-- points from this beat  
);

ALTER TABLE story\_beat\_completion ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "users\_can\_read\_their\_beat\_completions"  
  ON story\_beat\_completion FOR SELECT  
  USING (auth.uid() \= user\_id);  
