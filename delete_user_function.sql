-- Esegui questo script nel tuo Supabase SQL Editor per creare una funzione sicura
-- che permetta all'utente di eliminare definitivamente il suo account, incluso
-- l'account autenticato di sistema (auth.users).

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Permette alla funzione di eseguire l'eliminazione da auth.users
AS $$
DECLARE
  uid uuid;
BEGIN
  -- Ottiene l'ID dell'utente attualmente loggato che chiama la funzione
  uid := auth.uid();

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Non sei autorizzato a eseguire questa operazione.';
  END IF;

  -- 1. Elimina i SoulLinks collegati
  DELETE FROM public.soul_links WHERE sender_id = uid OR receiver_id = uid;

  -- 2. Elimina le interazioni (Like, Cuori, ecc.)
  DELETE FROM public.interactions WHERE from_user_id = uid OR to_user_id = uid;

  -- 3. Elimina le richieste di chat e i messaggi privati
  DELETE FROM public.chat_requests WHERE from_user_id = uid OR to_user_id = uid;

  -- 4. Elimina interazioni sui post (like, etc.) e poi i post veri e propri
  DELETE FROM public.post_interactions WHERE user_id = uid;
  DELETE FROM public.posts WHERE user_id = uid;

  -- 5. Elimina il profilo pubblico
  DELETE FROM public.users WHERE id = uid;

  -- 6. Infine, elimina permanentemente l'utente da Supabase Auth.
  -- (Attenzione: questo disconnetterà immediatamente l'utente ed è irreversibile)
  DELETE FROM auth.users WHERE id = uid;
  
END;
$$;
