<?php

/** @file pi_activity_extra.inc
 *  This is an include file that contains all the extra functions for pi_actitivy, this
 *  has been work in progress as some of the functions are old and to be removed - this is now
 *  mostly done, but some are still out of date/lacking checks
 */



function pi_activity_build_link_for_child($child_content_nid, $title) {
	$parent_content_nid = pi_node_hierarchy_get_parent($child_content_nid);
	$activity_nid = pi_activity_get_activity_nid_for_content_nid($parent_content_nid);
	
	global $user;
	$activity_node = node_load($activity_nid);
	$access_manager = pi_info()->getAccessManager(pi_info()->getInquiryInfoForActivity($activity_nid)->getInquiryNid(), $user->uid);
	

	$access = $access_manager->getAccessToItem($activity_node);
	if ($access === 'hidden') {
		$image = 'unavailable.png';
	} else {
		$image = $access . 'able.png';
	} 

	global $base_path;
	$image_path = $base_path . '/' . drupal_get_path('module', 'pi') . '/images/' . $image;

	$text = check_plain($title) . '&nbsp;' . "<img width='12' src='" . $image_path . "'/>";

	if ($access !== 'hidden') {
		$url = "activity/$activity_nid/edit/$child_content_nid";
		return l($text, $url, array('html' => TRUE, 'fragment' => $activity_nid, 'attributes' => array('class' => 'nquire_button_link nquire_button_link_activity_work_small')));
	} else {
		return $text;
	}
}


function pi_activity_build_link($activity_nid, $force_active = FALSE) {
	global $user;
	$content_manager = pi_info()->getContentManager();
	$inquiry_info = pi_info()->getInquiryInfoForActivity($activity_nid);
	$inquiry_access = pi_info()->getAccessManager($inquiry_info->getInquiryNid(), $user->uid);
	$activity_node = $inquiry_info->getActivity($activity_nid);
	
	$content_exists = $content_manager->getContent($activity_nid, $user->uid, FALSE);
	
	$access = $inquiry_access->getAccessToItem($activity_node);
	switch ($access) {
		case 'edit':
			$image = 'editable.png';
			break;
		case 'view':
			$image = $content_exists ? 'viewable.png' : 'unavailable.png';
			break;
		default:
			$image = 'unavailable.png';
			break;
	}

	$image_path = url(drupal_get_path('module', 'pi') . '/images/' . $image);

	$text = check_plain($activity_node->title) . '&nbsp;' . "<img width='12' src='" . $image_path . "'/>";

	if ($access !== 'hidden') {
    $args = array('html' => TRUE, 'fragment' => $activity_nid);
    if ($force_active) {
      $args['attributes'] = array('class' => 'active');
    }
		return l($text, "activity/$activity_nid", $args);
	} else {
		return $text;
	}
}

