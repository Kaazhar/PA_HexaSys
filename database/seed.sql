
USE upcycleconnect;

INSERT INTO categories (created_at, updated_at, name, slug, description, icon, color, is_active) VALUES
(NOW(), NOW(), 'Mobilier', 'mobilier', 'Meubles et décoration', 'sofa', '#8B5CF6', 1),
(NOW(), NOW(), 'Électronique', 'electronique', 'Appareils électroniques', 'cpu', '#3B82F6', 1),
(NOW(), NOW(), 'Vêtements', 'vetements', 'Mode et accessoires', 'shirt', '#EC4899', 1),
(NOW(), NOW(), 'Livres & Médias', 'livres-medias', 'Livres, DVD, jeux', 'book', '#F59E0B', 1),
(NOW(), NOW(), 'Bricolage', 'bricolage', 'Outils et matériaux', 'wrench', '#10B981', 1);


INSERT INTO containers (created_at, updated_at, name, address, district, capacity, current_count, status, latitude, longitude) VALUES
(NOW(), NOW(), 'Conteneur République', 'Place de la République', '75011', 30, 12, 'operational', 48.8674, 2.3631),
(NOW(), NOW(), 'Conteneur Bastille', 'Place de la Bastille', '75012', 25, 20, 'operational', 48.8533, 2.3692),
(NOW(), NOW(), 'Conteneur Nation', 'Place de la Nation', '75011', 20, 5, 'operational', 48.8484, 2.3957),
(NOW(), NOW(), 'Conteneur Oberkampf', 'Rue Oberkampf', '75011', 15, 15, 'full', 48.8650, 2.3745),
(NOW(), NOW(), 'Conteneur Marais', 'Rue de Bretagne', '75003', 25, 8, 'operational', 48.8626, 2.3598);


